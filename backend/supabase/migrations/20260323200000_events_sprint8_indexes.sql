create index if not exists idx_event_sessions_event_position
  on public.event_sessions(event_id, position);

create index if not exists idx_event_schedule_items_session_position
  on public.event_schedule_items(session_id, position);