"use client";

import React, { useEffect, useState } from "react";
import dayjs from "dayjs";

interface Props {
  target: string;
}

const Countdown: React.FC<Props> = ({ target }) => {
  const [diff, setDiff] = useState(dayjs(target).diff(dayjs(), "second"));

  useEffect(() => {
    const id = setInterval(() => {
      setDiff(dayjs(target).diff(dayjs(), "second"));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (diff <= 0) {
    return <span className="text-emerald-400 text-sm font-semibold">Unlocked</span>;
  }

  const duration = {
    days: Math.floor(diff / (60 * 60 * 24)),
    hours: Math.floor((diff / (60 * 60)) % 24),
    minutes: Math.floor((diff / 60) % 60),
    seconds: diff % 60
  };

  const parts = [];
  if (duration.days) parts.push(`${duration.days} day${duration.days !== 1 ? "s" : ""}`);
  if (duration.hours) parts.push(`${duration.hours} hour${duration.hours !== 1 ? "s" : ""}`);
  if (duration.minutes) parts.push(`${duration.minutes} minute${duration.minutes !== 1 ? "s" : ""}`);
  parts.push(`${duration.seconds} second${duration.seconds !== 1 ? "s" : ""}`);

  return (
    <span className="text-sm text-slate-200 font-medium">
      Unlocks in {parts.join(" ")}
    </span>
  );
};

export default Countdown;

