/*
 * Content Calendar — Visual scheduling for content across platforms
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const scheduledContent: Record<number, Array<{ title: string; character: string; platform: string; time: string; color: string }>> = {
  3: [{ title: "Tech Review", character: "Nova", platform: "YT", time: "10:00", color: "bg-primary" }],
  5: [{ title: "Dance Challenge", character: "Kai", platform: "TT", time: "14:00", color: "bg-destructive" }],
  7: [
    { title: "ASMR Session", character: "Aura", platform: "IG", time: "20:00", color: "bg-success" },
    { title: "AI News #24", character: "Nova", platform: "YT", time: "12:00", color: "bg-primary" },
  ],
  10: [{ title: "Reaction Video", character: "Kai", platform: "YT", time: "16:00", color: "bg-warning" }],
  12: [{ title: "Meditation #13", character: "Aura", platform: "YT", time: "08:00", color: "bg-success" }],
  14: [{ title: "Unboxing", character: "Nova", platform: "YT", time: "11:00", color: "bg-primary" }],
  17: [{ title: "Challenge #48", character: "Kai", platform: "TT", time: "15:00", color: "bg-destructive" }],
  19: [{ title: "Routine ASMR", character: "Aura", platform: "IG", time: "21:00", color: "bg-success" }],
  21: [
    { title: "Weekly Recap", character: "Nova", platform: "YT", time: "10:00", color: "bg-primary" },
    { title: "Prank Video", character: "Kai", platform: "TT", time: "13:00", color: "bg-destructive" },
  ],
  24: [{ title: "Tech Trends", character: "Nova", platform: "YT", time: "10:00", color: "bg-primary" }],
  26: [{ title: "Sound Bath", character: "Aura", platform: "YT", time: "19:00", color: "bg-success" }],
  28: [{ title: "Street Food", character: "Kai", platform: "TT", time: "14:00", color: "bg-warning" }],
};

export default function ContentCalendar() {
  const [currentMonth] = useState("March 2026");
  const daysInMonth = 31;
  const startDay = 6; // March 2026 starts on Sunday, so offset = 6 for Mon-start

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-muted-foreground mt-1">Plan and schedule content across all platforms.</p>
        </div>
        <Button onClick={() => toast("Schedule content coming soon!")} className="gap-2">
          <Plus className="w-4 h-4" />
          Schedule Content
        </Button>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => toast("Month navigation coming soon!")}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-lg font-semibold">{currentMonth}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => toast("Month navigation coming soon!")}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
                  {d}
                </div>
              ))}
            </div>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const events = day ? scheduledContent[day] || [] : [];
                const isToday = day === 1;
                return (
                  <div
                    key={i}
                    className={`
                      min-h-[90px] p-1.5 rounded-lg border transition-colors cursor-pointer
                      ${day ? "border-border/30 hover:border-primary/30 hover:bg-accent/30" : "border-transparent"}
                      ${isToday ? "bg-primary/5 border-primary/30" : ""}
                    `}
                    onClick={() => day && toast("Day detail view coming soon!")}
                  >
                    {day && (
                      <>
                        <span className={`text-xs font-mono ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {day}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {events.slice(0, 2).map((ev, j) => (
                            <div key={j} className={`${ev.color} rounded px-1 py-0.5 text-white`}>
                              <p className="text-[10px] font-medium truncate">{ev.title}</p>
                            </div>
                          ))}
                          {events.length > 2 && (
                            <p className="text-[10px] text-muted-foreground text-center">+{events.length - 2} more</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Upcoming This Week */}
      <motion.div variants={fadeUp}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Upcoming This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(scheduledContent)
                .filter(([d]) => Number(d) <= 7)
                .flatMap(([d, events]) =>
                  events.map((ev, i) => (
                    <div key={`${d}-${i}`} className="flex items-center justify-between p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 rounded-full ${ev.color}`} />
                        <div>
                          <p className="text-sm font-medium">{ev.title}</p>
                          <p className="text-xs text-muted-foreground">{ev.character} · {ev.platform}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono">Mar {d}</p>
                        <p className="text-xs text-muted-foreground">{ev.time}</p>
                      </div>
                    </div>
                  ))
                )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
