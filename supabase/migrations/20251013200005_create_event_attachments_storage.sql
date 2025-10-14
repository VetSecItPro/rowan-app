-- Create storage bucket for event attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-attachments', 'event-attachments', false)
ON CONFLICT (id) DO NOTHING;
