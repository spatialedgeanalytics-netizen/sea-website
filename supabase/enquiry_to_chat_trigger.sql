-- Run this in Supabase SQL Editor
-- When a client submits the contact form, it automatically appears in SEA Chat

CREATE OR REPLACE FUNCTION public.enquiry_to_chat()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.chat_messages (message, sender_id, created_at)
  VALUES (
    '📩 WEBSITE ENQUIRY' || E'\n' ||
    'Name: '    || NEW.name                        || E'\n' ||
    'Email: '   || COALESCE(NEW.email, '—')        || E'\n' ||
    'Phone: '   || COALESCE(NEW.phone, '—')        || E'\n' ||
    'Subject: ' || COALESCE(NEW.subject, '—')      || E'\n\n' ||
    NEW.message,
    NULL,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_enquiry_to_chat ON public.contact_enquiries;
CREATE TRIGGER on_enquiry_to_chat
  AFTER INSERT ON public.contact_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.enquiry_to_chat();
