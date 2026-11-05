"use client";

import { useEconomicEvents } from "@/hooks/useEconomicEvents";
import { formatEconomicEventDate, formatEconomicEventTime } from "@/lib/events";

export function EconomicCalendar() {
  const { events, fetchedAt } = useEconomicEvents();
  if (events.length === 0) return null;

  return (
    <footer
      className="economic-calendar"
      aria-label="财经日历（北京时间）"
      data-timezone="Asia/Shanghai"
      data-event-count={events.length}
      data-events-fetched-at={fetchedAt ?? undefined}
    >
      <ul className="economic-events">
        {events.map((event) => {
          const date = formatEconomicEventDate(event.startsAt);
          const time = formatEconomicEventTime(event.startsAt);
          return (
            <li
              className="economic-event"
              key={`${event.kind}-${event.startsAt}`}
              aria-label={`${event.name} ${date} ${time}`}
              data-event={event.kind}
              data-event-date={event.date}
              data-event-time={event.time}
            >
              <span className="economic-event-name">{event.name}</span>
              <time
                className="economic-event-time"
                dateTime={`${event.date}T${event.time}:00+08:00`}
              >
                {time}
              </time>
              <span className="economic-event-date">{date}</span>
            </li>
          );
        })}
      </ul>
    </footer>
  );
}
