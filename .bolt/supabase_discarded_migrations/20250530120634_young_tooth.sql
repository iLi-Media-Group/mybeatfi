-- Create chat_rooms table
CREATE TABLE public.chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  room_type TEXT NOT NULL CHECK (room_type IN ('admin', 'producer', 'mixed')),
  is_active BOOLEAN DEFAULT true
);

-- Create chat_room_members table
CREATE TABLE public.chat_room_members (
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_system_message BOOLEAN DEFAULT false
);

-- Create contact_messages table for the contact form
CREATE TABLE public.contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
  assigned_to UUID REFERENCES profiles(id)
);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('feature', 'event', 'youtube', 'general')),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id),
  is_featured BOOLEAN DEFAULT false,
  external_url TEXT,
  image_url TEXT
);

-- RLS Policies

-- Chat Rooms
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rooms they are members of"
ON public.chat_rooms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_room_members 
    WHERE room_id = id AND user_id = auth.uid()
  ) OR 
  (
    SELECT account_type FROM profiles WHERE id = auth.uid()
  ) = 'admin'
);

CREATE POLICY "Only admins can create chat rooms"
ON public.chat_rooms
FOR INSERT
WITH CHECK (
  (
    SELECT account_type FROM profiles WHERE id = auth.uid()
  ) = 'admin'
);

-- Chat Room Members
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view room members"
ON public.chat_room_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_room_members 
    WHERE room_id = chat_room_members.room_id 
    AND user_id = auth.uid()
  ) OR 
  (
    SELECT account_type FROM profiles WHERE id = auth.uid()
  ) = 'admin'
);

-- Chat Messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their rooms"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_room_members 
    WHERE room_id = chat_messages.room_id 
    AND user_id = auth.uid()
  ) OR 
  (
    SELECT account_type FROM profiles WHERE id = auth.uid()
  ) = 'admin'
);

CREATE POLICY "Users can send messages to their rooms"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_room_members 
    WHERE room_id = chat_messages.room_id 
    AND user_id = auth.uid()
  )
);

-- Contact Messages
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view contact messages"
ON public.contact_messages
FOR SELECT
USING (
  (
    SELECT account_type FROM profiles WHERE id = auth.uid()
  ) = 'admin'
);

CREATE POLICY "Anyone can create contact messages"
ON public.contact_messages
FOR INSERT
WITH CHECK (true);

-- Announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published announcements"
ON public.announcements
FOR SELECT
USING (
  published_at <= now() AND 
  (expires_at IS NULL OR expires_at > now())
);

CREATE POLICY "Only admins can manage announcements"
ON public.announcements
FOR ALL
USING (
  (
    SELECT account_type FROM profiles WHERE id = auth.uid()
  ) = 'admin'
);

-- Functions and Triggers

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Update timestamps triggers
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON chat_rooms
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
