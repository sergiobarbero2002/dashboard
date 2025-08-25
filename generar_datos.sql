TRUNCATE TABLE public.mail_message CASCADE;

-- Script simple para generar datos con probabilidades específicas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  num_records INT := 50000;
  i INT;
  base_date TIMESTAMP;
BEGIN
  -- Generar emails del pasado (últimos 1000 días)
  FOR i IN 1..num_records LOOP
    base_date := NOW() - (random() * interval '1000 days');
    
    INSERT INTO public.mail_message (
      id, hotel_id, received_ts, response_ts, from_email, from_name, subject,
      has_attachment, guest_hash, delete_after, message, ai_reply,
      banned_email, manual_intervention
    ) VALUES (
      gen_random_uuid(),
      CASE (i % 3) WHEN 1 THEN 'demo1' WHEN 2 THEN 'demo2' ELSE 'demo3' END,
      base_date,
      CASE 
        WHEN random() < 0.98 THEN -- 98% respondidos
          base_date + 
          CASE 
            WHEN random() < 0.82 THEN (random() * 8 + 1) * interval '1 minute' -- 82% entre 1-9 min
            WHEN random() < 0.92 THEN (random() * 50 + 10) * interval '1 minute' -- 10% entre 10-60 min
            WHEN random() < 0.97 THEN (random() * 178 + 61) * interval '1 minute' -- 5% entre 61-239 min
            WHEN random() < 0.99 THEN (random() * 1200 + 240) * interval '1 minute' -- 2% entre 4h-24h
            ELSE (random() * 4320 + 1440) * interval '1 minute' -- 1% más de 24h (24h-72h)
          END
        ELSE NULL -- 2% sin respuesta
      END,
      'guest_past_' || i || '@demo.com',
      'Guest Past ' || i,
      'Asunto Pasado ' || i,
      random() < 0.15,
      encode(gen_random_bytes(16), 'hex'),
      NOW() + interval '365 days',
      'Mensaje de prueba del pasado',
      CASE WHEN random() < 0.60 THEN 'Respuesta IA' END,
      FALSE,
      random() < 0.35
    );
  END LOOP;

  -- Generar emails del futuro (próximos 1000 días)
  FOR i IN 1..num_records LOOP
    base_date := NOW() + (random() * interval '1000 days');
    
    INSERT INTO public.mail_message (
      id, hotel_id, received_ts, response_ts, from_email, from_name, subject,
      has_attachment, guest_hash, delete_after, message, ai_reply,
      banned_email, manual_intervention
    ) VALUES (
      gen_random_uuid(),
      CASE (i % 3) WHEN 1 THEN 'demo1' WHEN 2 THEN 'demo2' ELSE 'demo3' END,
      base_date,
      CASE 
        WHEN random() < 0.98 THEN -- 98% respondidos
          base_date + 
          CASE 
            WHEN random() < 0.82 THEN (random() * 8 + 1) * interval '1 minute' -- 82% entre 1-9 min
            WHEN random() < 0.92 THEN (random() * 50 + 10) * interval '1 minute' -- 10% entre 10-60 min
            WHEN random() < 0.97 THEN (random() * 178 + 61) * interval '1 minute' -- 5% entre 61-239 min
            WHEN random() < 0.99 THEN (random() * 1200 + 240) * interval '1 minute' -- 2% entre 4h-24h
            ELSE (random() * 4320 + 1440) * interval '1 minute' -- 1% más de 24h (24h-72h)
          END
        ELSE NULL -- 2% sin respuesta
      END,
      'guest_future_' || i || '@demo.com',
      'Guest Future ' || i,
      'Asunto Futuro ' || i,
      random() < 0.15,
      encode(gen_random_bytes(16), 'hex'),
      NOW() + interval '365 days',
      'Mensaje de prueba del futuro',
      CASE WHEN random() < 0.60 THEN 'Respuesta IA' END,
      FALSE,
      random() < 0.35
    );
  END LOOP;

  -- Generar análisis
  INSERT INTO public.mail_analysis (
    mail_uuid, model_version, main_category, sub_category, sentiment,
    urgency, lose_client_risk, upsell_accepted, upsell_accepted_ts,
    upsell_revenue_eur, privacity_needed, gdpr_pseudonymised,
    summary, language, upselling_offer
  )
  SELECT 
    m.id,
    (ARRAY['v1.0.0','v1.1.0','v1.2.3'])[floor(random()*3)+1],
    CASE 
      WHEN random() < 0.05 THEN 'Incidencia'
      ELSE 
        CASE 
          WHEN random() < 0.50 THEN 'Estancia' -- 50% más probable
          WHEN random() < 0.85 THEN 'FAQ' -- 15%
          WHEN random() < 0.95 THEN 'Eventos' -- 10%
          ELSE 'Operaciones' -- 5%
        END
    END,
    CASE 
      WHEN (CASE 
        WHEN random() < 0.05 THEN 'Incidencia'
        ELSE 
          CASE 
            WHEN random() < 0.50 THEN 'Estancia'
            WHEN random() < 0.85 THEN 'FAQ'
            WHEN random() < 0.95 THEN 'Eventos'
            ELSE 'Operaciones'
          END
      END) = 'Incidencia' THEN -- Solo para incidencias
        CASE 
          WHEN random() < 0.45 THEN 'Pérdida de objetos' -- 30% más probable
          WHEN random() < 0.75 THEN 'Queja de instalaciones' -- 30% más probable
          WHEN random() < 0.85 THEN 'Queja de estancia' -- 20%
          WHEN random() < 0.95 THEN 'Queja del personal' -- 15%
          ELSE 'Queja de otros servicios del hotel' -- 5%
        END
      ELSE 'Queja de otros servicios del hotel'
    END,
    CASE 
      WHEN random() < 0.22 THEN 'Muy Positivo' -- 45% más probable
      WHEN random() < 0.50 THEN 'Positivo' -- 30%
      WHEN random() < 0.75 THEN 'Medio' -- 15%
      WHEN random() < 0.90 THEN 'Negativo' -- 7%
      ELSE 'Muy Negativo' -- 3%
    END::public.sentiment_enum,
    (ARRAY['Muy Alto','Alto','Medio','Bajo','No'])[floor(random()*5)+1]::public.urgency_enum,
    (ARRAY['Muy Alto','Alto','Medio','Bajo','No'])[floor(random()*5)+1]::public.lose_risk_enum,
    CASE 
      WHEN random() < 0.85 THEN -- 85% oferta
        CASE WHEN random() < 0.40 THEN TRUE ELSE FALSE END -- 40% aceptación
      ELSE FALSE
    END,
    CASE 
      WHEN random() < 0.85 AND random() < 0.40 THEN 
        m.received_ts + interval '1 hour'
      ELSE NULL
    END,
    CASE 
      WHEN random() < 0.85 AND random() < 0.40 THEN 
        20 + (random() * 180)::numeric(12,2)
      ELSE NULL
    END,
    random() < 0.20,
    random() < 0.04,
    'Resumen automático',
    CASE 
      WHEN random() < 0.72 THEN 'Español'
      WHEN random() < 0.87 THEN 'Inglés'
      WHEN random() < 0.92 THEN 'Francés'
      WHEN random() < 0.97 THEN 'Alemán'
      ELSE 'Italiano'
    END,
    random() < 0.85 -- 85% oferta
  FROM public.mail_message m;

  -- Generar incidencias (solo para emails marcados como incidencia)
  INSERT INTO public.mail_incidencias (
    uuid, tg_message_id, ts_creacion, ts_gestion, ts_resolucion,
    resenya_clicked, delay_gestion_min, delay_resolucion_min, received_hotel_mail_id
  )
  SELECT 
    m.id,
    'TG-' || m.id::text,
    m.received_ts + interval '1 hour',
    CASE WHEN random() < 0.80 THEN m.received_ts + interval '2 hours' END,
    CASE WHEN random() < 0.50 THEN m.received_ts + interval '4 hours' END,
    random() < 0.30,
    floor(random() * 15)::smallint,
    floor(random() * 30)::smallint,
    'HOTEL-' || m.id::text
  FROM public.mail_message m
  JOIN public.mail_analysis a ON m.id = a.mail_uuid
  WHERE a.main_category = 'Incidencia';

END $$;



select count(*) from mail_message where hotel_id = 'demo1' limit 100;
select sub_category from mail_analysis where main_category = 'Incidencia' limit 100;

