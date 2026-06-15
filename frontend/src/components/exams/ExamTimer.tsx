import React, { useEffect, useState } from "react";
import { Paper, Typography, Box } from "@mui/material";
import TimerIcon from "@mui/icons-material/Timer";

interface ExamTimerProps {
  durationMinutes: number;
  startedAt: string; // ISO timestamp
  onTimeout: () => void;
}

export const ExamTimer: React.FC<ExamTimerProps> = ({
  durationMinutes,
  startedAt,
  onTimeout
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(durationMinutes * 60);

  useEffect(() => {
    const startMs = new Date(startedAt).getTime();
    const durationMs = durationMinutes * 60 * 1000;
    const endMs = startMs + durationMs;

    const interval = setInterval(() => {
      const remainingSeconds = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
      setTimeLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        clearInterval(interval);
        onTimeout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [durationMinutes, startedAt, onTimeout]);

  // Format time (HH:MM:SS)
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const pad = (n: number) => n.toString().padStart(2, "0");
    
    if (h > 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  };

  const isLowTime = timeLeft < 60;
  const isMediumTime = timeLeft < 300;

  const getColors = () => {
    if (isLowTime) {
      return {
        bg: "#fef2f2",
        border: "#fecaca",
        text: "#ef4444"
      };
    }
    if (isMediumTime) {
      return {
        bg: "#fffbeb",
        border: "#fef3c7",
        text: "#d97706"
      };
    }
    return {
      bg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0040b0"
    };
  };

  const colors = getColors();

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 1.2, 
        px: 2,
        display: "flex", 
        alignItems: "center", 
        gap: 1.5, 
        bgcolor: colors.bg, 
        borderRadius: "10px",
        border: `1px solid ${colors.border}`,
        transition: "background-color 0.3s, border-color 0.3s"
      }}
    >
      <TimerIcon sx={{ color: colors.text, fontSize: 20 }} />
      <Box>
        <Typography 
          variant="caption" 
          color="#64748b" 
          display="block" 
          sx={{ lineHeight: 1, fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.5px", mb: 0.2 }}
        >
          Осталось времени
        </Typography>
        <Typography 
          variant="subtitle1" 
          fontWeight={800} 
          fontFamily="monospace"
          sx={{ color: colors.text, lineHeight: 1, minWidth: 60, fontSize: "1rem" }}
        >
          {formatTime(timeLeft)}
        </Typography>
      </Box>
    </Paper>
  );
};
export default ExamTimer;
