-- Fortress Feud is now a turn-based physics siege: refresh its library description.
update public.games
set description = 'Build a fortress from timber, stone and steel, then drag, aim and launch to topple your rival''s. Duel a friend, team up against the Machine, or conquer twelve solo missions.'
where slug = 'fortress-feud';
