// Supabase Edge Function: check-alerts-cron
// Description: Evaluates vehicle alerts, handles atomic cycle deduplication, and sends email notifications via Resend.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertEvaluationItem {
  vehiculoId: string;
  plate: string;
  model?: string | null;
  eventoId: string;
  eventoName: string;
  appliesBy: string;
  state: 'NORMAL' | 'PROXIMO' | 'VENCIDO' | 'SIN_DATOS' | 'SIN_HISTORIAL';
  currentMileage: number | null;
  targetMileage: number | null;
  remainingKms: number | null;
  targetDate: string | null;
  remainingDays: number | null;
  reason: string;
  cycleAnchor: string;
  ownerId?: string | null;
  ownerEmail?: string | null;
  driverId?: string | null;
  driverEmail?: string | null;
  driverName?: string | null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Faltan variables de entorno de Supabase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch active events catalog
    const { data: eventos, error: errEvents } = await supabase
      .from("eventos")
      .select("id, name, kms_interval, months_interval, applies_by, advance_warning_kms, advance_warning_days, is_active")
      .eq("is_active", true);

    if (errEvents || !eventos) {
      throw new Error(`Error obteniendo catálogo de eventos: ${errEvents?.message}`);
    }

    // 2. Fetch all vehicles with driver & owner details
    const { data: vehiculos, error: errVehicles } = await supabase
      .from("vehiculos")
      .select(`
        id, plate, model, owner_id, driver_id, servicio_id,
        soat_expiration_date, tecnomecanica_expiration_date, operation_card_validity_end,
        owner:terceros!owner_id(id, name, email),
        driver:terceros!driver_id(id, name, email, driver_license_expiration)
      `);

    if (errVehicles || !vehiculos) {
      throw new Error(`Error obteniendo catálogo de vehículos: ${errVehicles?.message}`);
    }

    const evaluationList: AlertEvaluationItem[] = [];
    const todayStr = new Date().toISOString().split("T")[0];
    const today = new Date(todayStr);

    // 3. Evaluate alerts per vehicle and event
    for (const v of vehiculos) {
      // Latest current mileage
      const { data: prodData } = await supabase
        .from("produccion")
        .select("mileage")
        .eq("vehiculo_id", v.id)
        .gt("mileage", 0)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const currKm = prodData?.mileage || null;

      // Extract emails (Excluding contractor / tercero_id from servicios)
      const ownerEmail = (v.owner as any)?.email?.trim() || null;
      const driverEmail = (v.driver as any)?.email?.trim() || null;
      const driverName = (v.driver as any)?.name || null;

      for (const evt of eventos) {
        const warnKms = evt.advance_warning_kms || 500;
        const warnDays = evt.advance_warning_days || 7;

        // Fetch latest control for this vehicle + event
        const { data: ctrlData } = await supabase
          .from("control")
          .select("id, next_change_mileage, next_change_date")
          .eq("vehiculo_id", v.id)
          .eq("evento_id", evt.id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        let cycleAnchor: string | null = null;
        let targetMileage: number | null = null;
        let targetDate: string | null = null;

        if (ctrlData) {
          cycleAnchor = ctrlData.id;
          targetMileage = ctrlData.next_change_mileage || null;
          targetDate = ctrlData.next_change_date || null;
        } else {
          // Legal fallbacks
          const nameLower = evt.name.toLowerCase();
          if (nameLower.includes("soat") && v.soat_expiration_date) {
            cycleAnchor = `soat_init_${v.id}`;
            targetDate = v.soat_expiration_date;
          } else if (nameLower.includes("tecno") && v.tecnomecanica_expiration_date) {
            cycleAnchor = `tecno_init_${v.id}`;
            targetDate = v.tecnomecanica_expiration_date;
          } else if (nameLower.includes("tarjeta") && v.operation_card_validity_end) {
            cycleAnchor = `opcard_init_${v.id}`;
            targetDate = v.operation_card_validity_end;
          } else if (nameLower.includes("licencia") && (v.driver as any)?.driver_license_expiration) {
            cycleAnchor = `driver_lic_${(v.driver as any).id}`;
            targetDate = (v.driver as any).driver_license_expiration;
          }
        }

        // Handle SIN_HISTORIAL (Section 9)
        if (!cycleAnchor || (!targetMileage && !targetDate)) {
          if (evt.applies_by === "ninguno") {
            continue; // Skip informative unconfigured events
          }
          evaluationList.push({
            vehiculoId: v.id,
            plate: v.plate,
            model: v.model,
            eventoId: evt.id,
            eventoName: evt.name,
            appliesBy: evt.applies_by,
            state: "SIN_HISTORIAL",
            currentMileage: currKm,
            targetMileage: null,
            remainingKms: null,
            targetDate: null,
            remainingDays: null,
            reason: "SIN HISTORIAL / PENDIENTE REGISTRO INICIAL",
            cycleAnchor: "no_cycle",
            ownerId: v.owner_id,
            ownerEmail,
            driverId: v.driver_id,
            driverEmail,
            driverName,
          });
          continue;
        }

        // Distance state evaluation
        let kmState = "SIN_DATOS";
        let remKms: number | null = null;
        if (targetMileage != null) {
          if (currKm != null && currKm > 0) {
            remKms = targetMileage - currKm;
            const kmAlertVal = targetMileage - warnKms;
            if (currKm < kmAlertVal) kmState = "NORMAL";
            else if (currKm < targetMileage) kmState = "PROXIMO";
            else kmState = "VENCIDO";
          }
        }

        // Date state evaluation
        let dateState = "SIN_DATOS";
        let remDays: number | null = null;
        if (targetDate != null) {
          const tDate = new Date(targetDate);
          remDays = Math.ceil((tDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          const alertDate = new Date(tDate.getTime() - warnDays * 24 * 3600 * 1000);
          if (today < alertDate) dateState = "NORMAL";
          else if (today <= tDate) dateState = "PROXIMO";
          else dateState = "VENCIDO";
        }

        // Final state determination (Max severity)
        let finalState: 'NORMAL' | 'PROXIMO' | 'VENCIDO' | 'SIN_DATOS' | 'SIN_HISTORIAL' = "SIN_DATOS";
        let reason = "";

        if (evt.applies_by === "kilometros") {
          finalState = kmState as any;
          reason = kmState === "VENCIDO" ? `Vencido por kilometraje (${Math.abs(remKms || 0)} km excedidos)`
            : kmState === "PROXIMO" ? `Próximo por kilometraje (${remKms} km restantes)`
            : kmState === "NORMAL" ? "Kilometraje en rango normal" : "Sin datos de kilometraje";
        } else if (evt.applies_by === "meses") {
          finalState = dateState as any;
          reason = dateState === "VENCIDO" ? `Vencido por fecha (${Math.abs(remDays || 0)} días de retraso)`
            : dateState === "PROXIMO" ? `Próximo por fecha (${remDays} días restantes)`
            : dateState === "NORMAL" ? "Fecha en rango normal" : "Sin fecha objetivo";
        } else if (evt.applies_by === "kilometros_y_meses") {
          if (kmState === "VENCIDO" || dateState === "VENCIDO") {
            finalState = "VENCIDO";
            if (kmState === "VENCIDO" && dateState === "VENCIDO") reason = "Vencido por kilometraje y fecha";
            else if (kmState === "VENCIDO") reason = dateState === "SIN_DATOS" ? "Vencido por kilometraje — sin fecha objetivo" : `Vencido por kilometraje (${Math.abs(remKms || 0)} km excedidos)`;
            else reason = kmState === "SIN_DATOS" ? "Vencido por fecha — sin datos de kilometraje" : `Vencido por fecha (${Math.abs(remDays || 0)} días de retraso)`;
          } else if (kmState === "PROXIMO" || dateState === "PROXIMO") {
            finalState = "PROXIMO";
            if (kmState === "PROXIMO" && dateState === "PROXIMO") reason = "Próximo por kilometraje y fecha";
            else if (kmState === "PROXIMO") reason = dateState === "SIN_DATOS" ? "Próximo por kilometraje — sin fecha objetivo" : `Próximo por kilometraje (${remKms} km restantes)`;
            else reason = kmState === "SIN_DATOS" ? "Próximo por fecha — sin datos de kilometraje" : `Próximo por fecha (${remDays} días restantes)`;
          } else if (kmState === "NORMAL" || dateState === "NORMAL") {
            finalState = "NORMAL";
            reason = "Normal por datos disponibles";
          }
        }

        evaluationList.push({
          vehiculoId: v.id,
          plate: v.plate,
          model: v.model,
          eventoId: evt.id,
          eventoName: evt.name,
          appliesBy: evt.applies_by,
          state: finalState,
          currentMileage: currKm,
          targetMileage,
          remainingKms: remKms,
          targetDate,
          remainingDays: remDays,
          reason,
          cycleAnchor,
          ownerId: v.owner_id,
          ownerEmail,
          driverId: v.driver_id,
          driverEmail,
          driverName,
        });
      }
    }

    // 4. Filter actionable items (PROXIMO or VENCIDO) for notifications
    const actionable = evaluationList.filter((item) => item.state === "PROXIMO" || item.state === "VENCIDO");
    const summaryResults = {
      evaluated: evaluationList.length,
      actionable: actionable.length,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[],
    };

    for (const item of actionable) {
      const alertType: 'proximo' | 'vencido' = item.state === "PROXIMO" ? "proximo" : "vencido";

      // Consolidate valid recipient emails (Owner and Driver ONLY)
      const recipientEmailsSet = new Set<string>();
      if (item.ownerEmail && item.ownerEmail.includes("@")) recipientEmailsSet.add(item.ownerEmail.toLowerCase());
      if (item.driverEmail && item.driverEmail.includes("@")) recipientEmailsSet.add(item.driverEmail.toLowerCase());
      const recipientEmails = Array.from(recipientEmailsSet);

      if (recipientEmails.length === 0) {
        // Log incident: no valid emails for owner/driver (Section 25, 39)
        console.warn(`[Alerts Engine] Sin emails válidos para taxi ${item.plate} - ${item.eventoName}`);
        summaryResults.details.push({
          plate: item.plate,
          evento: item.eventoName,
          status: "skipped_no_email",
        });
        continue;
      }

      // Step 1: Atomic Reservation (Section 5 & 6)
      const { data: logInsert, error: errInsert } = await supabase
        .from("event_alerts_log")
        .insert({
          vehiculo_id: item.vehiculoId,
          evento_id: item.eventoId,
          cycle_anchor: item.cycleAnchor,
          alert_type: alertType,
          status: "pending",
          recipient_emails: recipientEmails,
        })
        .select("id, status")
        .single();

      let targetLogId: string | null = null;

      if (errInsert || !logInsert) {
        // Conflict occurred -> Check existing row
        const { data: existingLog } = await supabase
          .from("event_alerts_log")
          .select("id, status")
          .eq("vehiculo_id", item.vehiculoId)
          .eq("evento_id", item.eventoId)
          .eq("cycle_anchor", item.cycleAnchor)
          .eq("alert_type", alertType)
          .single();

        if (existingLog) {
          if (existingLog.status === "sent") {
            // Already sent successfully -> Skip duplicate! (Section 5 & 33 Test 3)
            summaryResults.skipped++;
            summaryResults.details.push({ plate: item.plate, evento: item.eventoName, status: "already_sent" });
            continue;
          } else if (existingLog.status === "pending") {
            // Processing in progress -> Skip
            summaryResults.skipped++;
            continue;
          } else if (existingLog.status === "failed") {
            // Failed status -> Selected for retry (Section 6 & 34 Test 5)
            targetLogId = existingLog.id;
          }
        }
      } else {
        targetLogId = logInsert.id;
      }

      if (!targetLogId) continue;

      summaryResults.processed++;

      // Build email content (Section 27)
      const subject = `[MaquiTaxis] ⚠️ Alerta: Taxi ${item.plate} - ${item.eventoName} (${item.state})`;
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px; border-radius: 8px;">
          <h2 style="color: ${item.state === 'VENCIDO' ? '#ef4444' : '#f59e0b'}; margin-top: 0;">
            ⚠️ Notificación de Alerta de Vehículo - ${item.state}
          </h2>
          <p><strong>Placa del Vehículo:</strong> ${item.plate} ${item.model ? `(${item.model})` : ''}</p>
          <p><strong>Evento de Mantenimiento:</strong> ${item.eventoName}</p>
          <p><strong>Estado Actual:</strong> <span style="background: ${item.state === 'VENCIDO' ? '#ef4444' : '#f59e0b'}; color: #fff; padding: 2px 8px; border-radius: 4px;">${item.state}</span></p>
          <p><strong>Conductor Asignado:</strong> ${item.driverName || 'No asignado'}</p>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 15px 0;" />
          <p><strong>Detalle de la Alerta:</strong> ${item.reason}</p>
          ${item.currentMileage ? `<p><strong>Kilometraje Actual:</strong> ${item.currentMileage.toLocaleString('es-CO')} km</p>` : ''}
          ${item.targetMileage ? `<p><strong>Kilometraje Objetivo:</strong> ${item.targetMileage.toLocaleString('es-CO')} km</p>` : ''}
          ${item.targetDate ? `<p><strong>Fecha Limite Objetivo:</strong> ${item.targetDate}</p>` : ''}
          <hr style="border: 0; border-top: 1px solid #334155; margin: 15px 0;" />
          <p style="color: #94a3b8; font-size: 0.85rem;">
            Por favor coordine la atención de este mantenimiento preventivo o renovación legal a la mayor brevedad posible.
          </p>
        </div>
      `;

      // Dispatch Email via Resend if API Key is configured (Section 24 & 51)
      if (!resendApiKey) {
        // Record failed status cleanly without crashing
        await supabase
          .from("event_alerts_log")
          .update({
            status: "failed",
            error_message: "RESEND_API_KEY not configured in environment",
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetLogId);

        summaryResults.failed++;
        summaryResults.details.push({ plate: item.plate, evento: item.eventoName, status: "failed_no_resend_key" });
        continue;
      }

      try {
        const resendResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "MaquiTaxis Alertas <alertas@maquitaxis.com>",
            to: recipientEmails,
            subject,
            html: htmlBody,
          }),
        });

        if (resendResp.ok) {
          // Success (Section 6 Step 3)
          await supabase
            .from("event_alerts_log")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              error_message: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetLogId);

          summaryResults.sent++;
          summaryResults.details.push({ plate: item.plate, evento: item.eventoName, status: "sent" });
        } else {
          // Email dispatch failed (Section 6 Step 4)
          const errText = await resendResp.text();
          await supabase
            .from("event_alerts_log")
            .update({
              status: "failed",
              error_message: `Resend API Error: ${errText}`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetLogId);

          summaryResults.failed++;
          summaryResults.details.push({ plate: item.plate, evento: item.eventoName, status: "failed", error: errText });
        }
      } catch (err: any) {
        await supabase
          .from("event_alerts_log")
          .update({
            status: "failed",
            error_message: `Fetch Exception: ${err.message}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetLogId);

        summaryResults.failed++;
        summaryResults.details.push({ plate: item.plate, evento: item.eventoName, status: "failed", error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, summary: summaryResults }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
