import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Popover,
  TextField,
  InputAdornment,
  Grid,
  Stack,
  Divider,
  Chip
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

interface DateRangePickerProps {
  startTime: string; // Format: YYYY-MM-DDTHH:MM or empty
  endTime: string;   // Format: YYYY-MM-DDTHH:MM or empty
  onChange: (start: string, end: string) => void;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startTime,
  endTime,
  onChange
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  
  // Date and Time parts in local strings (YYYY-MM-DD and HH:MM)
  const [startDateStr, setStartDateStr] = useState<string | null>(null);
  const [endDateStr, setEndDateStr] = useState<string | null>(null);
  const [startTimeStr, setStartTimeStr] = useState<string>("09:00");
  const [endTimeStr, setEndTimeStr] = useState<string>("18:00");

  // Display month state for the calendar view
  const [displayMonth, setDisplayMonth] = useState<Date>(() => new Date());

  // Parse incoming props
  useEffect(() => {
    if (startTime) {
      const parts = startTime.split("T");
      setStartDateStr(parts[0]);
      if (parts[1]) setStartTimeStr(parts[1].substring(0, 5));
      setDisplayMonth(new Date(parts[0]));
    } else {
      setStartDateStr(null);
    }

    if (endTime) {
      const parts = endTime.split("T");
      setEndDateStr(parts[0]);
      if (parts[1]) setEndTimeStr(parts[1].substring(0, 5));
    } else {
      setEndDateStr(null);
    }
  }, [startTime, endTime]);

  const handleOpen = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const isOpen = Boolean(anchorEl);

  // Month navigation
  const handlePrevMonth = () => {
    setDisplayMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Generate calendar days (Mon-Sun layout)
  const calendarDays = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    
    // Get starting weekday index (Monday=0, Sunday=6)
    let startDayOfWeek = firstDayOfMonth.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const days: Date[] = [];
    
    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDay - i));
    }
    
    // Current month days
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Next month filler days to complete a 6-row grid (42 days)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  }, [displayMonth]);

  // Format Helper to convert local Date object to YYYY-MM-DD string
  const toLocalDateString = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDayClick = (day: Date) => {
    const dayStr = toLocalDateString(day);

    if (!startDateStr || (startDateStr && endDateStr)) {
      // Start a new range selection
      setStartDateStr(dayStr);
      setEndDateStr(null);
    } else {
      // Complete range selection
      if (dayStr < startDateStr) {
        // If clicked day is before start date, set it as start date
        setStartDateStr(dayStr);
      } else {
        setEndDateStr(dayStr);
      }
    }
  };

  // Check state of a calendar day
  const getDayStatus = (day: Date) => {
    const dayStr = toLocalDateString(day);
    const isStart = startDateStr === dayStr;
    const isEnd = endDateStr === dayStr;
    const isInRange = startDateStr && endDateStr && dayStr > startDateStr && dayStr < endDateStr;
    const isGreyed = day.getMonth() !== displayMonth.getMonth();

    return { isStart, isEnd, isInRange, isGreyed };
  };

  // Preset Handlers
  const applyPreset = (days: number) => {
    const today = new Date();
    const startStr = toLocalDateString(today);
    
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    const endStr = toLocalDateString(futureDate);

    setStartDateStr(startStr);
    setEndDateStr(endStr);
    setStartTimeStr("09:00");
    setEndTimeStr("18:00");
    setDisplayMonth(today);
  };

  const handleClear = () => {
    setStartDateStr(null);
    setEndDateStr(null);
    setStartTimeStr("09:00");
    setEndTimeStr("18:00");
    onChange("", "");
    handleClose();
  };

  const handleApply = () => {
    if (!startDateStr) {
      onChange("", "");
      handleClose();
      return;
    }

    const startPayload = `${startDateStr}T${startTimeStr || "00:00"}`;
    const endPayload = endDateStr ? `${endDateStr}T${endTimeStr || "23:59"}` : `${startDateStr}T${endTimeStr || "23:59"}`;

    onChange(startPayload, endPayload);
    handleClose();
  };

  // Helper to format display text in the TextField
  const getDisplayText = () => {
    if (!startDateStr) return "Экзамен доступен всегда (без ограничений)";
    
    const formatDate = (str: string) => {
      const parts = str.split("-");
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    };

    const startText = `${formatDate(startDateStr)} ${startTimeStr}`;
    const endText = endDateStr ? `${formatDate(endDateStr)} ${endTimeStr}` : `не указано`;

    return `С ${startText} по ${endText}`;
  };

  return (
    <Box>
      <div onClick={handleOpen} style={{ cursor: "pointer" }}>
        <TextField
          label="Период доступности экзамена"
          value={getDisplayText()}
          fullWidth
          size="small"
          InputProps={{
            readOnly: true,
            startAdornment: (
              <InputAdornment position="start">
                <CalendarTodayIcon fontSize="small" sx={{ color: "#0040b0" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              backgroundColor: "#f8fafc",
              transition: "border-color 0.2s, background-color 0.2s",
              "&:hover": {
                backgroundColor: "#f1f5f9"
              }
            }
          }}
        />
      </div>

      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e2e8f0",
            mt: 1,
            overflow: "hidden"
          }
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} divider={<Divider orientation="vertical" flexItem />}>
          {/* Presets and Times Panel */}
          <Box p={2.5} width={220} display="flex" flexDirection="column" gap={2.5} bgcolor="#f8fafc">
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Быстрый выбор
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={1} gap={1}>
                <Chip label="Сегодня" onClick={() => applyPreset(0)} size="small" variant="outlined" clickable sx={{ borderRadius: "6px" }} />
                <Chip label="На 3 дня" onClick={() => applyPreset(3)} size="small" variant="outlined" clickable sx={{ borderRadius: "6px" }} />
                <Chip label="На неделю" onClick={() => applyPreset(7)} size="small" variant="outlined" clickable sx={{ borderRadius: "6px" }} />
                <Chip label="На 2 недели" onClick={() => applyPreset(14)} size="small" variant="outlined" clickable sx={{ borderRadius: "6px" }} />
              </Stack>
            </Box>

            <Divider />

            <Box display="flex" flexDirection="column" gap={2}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Настройка времени
              </Typography>
              
              <Box>
                <Typography variant="caption" display="block" color="text.secondary" gutterBottom>
                  Начало (Время)
                </Typography>
                <TextField
                  type="time"
                  size="small"
                  fullWidth
                  value={startTimeStr}
                  disabled={!startDateStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccessTimeIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" }
                  }}
                />
              </Box>

              <Box>
                <Typography variant="caption" display="block" color="text.secondary" gutterBottom>
                  Конец (Время)
                </Typography>
                <TextField
                  type="time"
                  size="small"
                  fullWidth
                  value={endTimeStr}
                  disabled={!startDateStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccessTimeIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" }
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Calendar Panel */}
          <Box p={2.5} width={340}>
            {/* Header Navigation */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <IconButton onClick={handlePrevMonth} size="small" sx={{ border: "1px solid #e2e8f0" }}>
                <NavigateBeforeIcon />
              </IconButton>
              <Typography sx={{ fontWeight: 850, color: "#0f172a" }}>
                {MONTHS[displayMonth.getMonth()]} {displayMonth.getFullYear()}
              </Typography>
              <IconButton onClick={handleNextMonth} size="small" sx={{ border: "1px solid #e2e8f0" }}>
                <NavigateNextIcon />
              </IconButton>
            </Box>

            {/* Weekdays header */}
            <Grid container spacing={0} mb={1}>
              {WEEKDAYS.map((wd, index) => (
                <Grid item xs={1.71} key={wd} textAlign="center">
                  <Typography variant="caption" sx={{ fontWeight: 800, color: index >= 5 ? "#ef4444" : "#64748b" }}>
                    {wd}
                  </Typography>
                </Grid>
              ))}
            </Grid>

            {/* Calendar Grid of days */}
            <Grid container spacing={0}>
              {calendarDays.map((day, idx) => {
                const { isStart, isEnd, isInRange, isGreyed } = getDayStatus(day);
                
                return (
                  <Grid 
                    item 
                    xs={1.71} 
                    key={idx} 
                    sx={{ 
                      position: "relative",
                      py: "4px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center"
                    }}
                  >
                    {/* Range connection background */}
                    {isInRange && (
                      <Box 
                        sx={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          top: "4px",
                          bottom: "4px",
                          bgcolor: "#edf2fa",
                          zIndex: 1
                        }}
                      />
                    )}
                    
                    {/* Start date background overlap connector */}
                    {isStart && endDateStr && (
                      <Box 
                        sx={{
                          position: "absolute",
                          left: "50%",
                          right: 0,
                          top: "4px",
                          bottom: "4px",
                          bgcolor: "#edf2fa",
                          zIndex: 1
                        }}
                      />
                    )}

                    {/* End date background overlap connector */}
                    {isEnd && startDateStr && (
                      <Box 
                        sx={{
                          position: "absolute",
                          left: 0,
                          right: "50%",
                          top: "4px",
                          bottom: "4px",
                          bgcolor: "#edf2fa",
                          zIndex: 1
                        }}
                      />
                    )}

                    {/* Day button */}
                    <Button
                      onClick={() => handleDayClick(day)}
                      sx={{
                        minWidth: 0,
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        p: 0,
                        zIndex: 2,
                        textTransform: "none",
                        fontWeight: (isStart || isEnd) ? 800 : 500,
                        color: (isStart || isEnd) 
                          ? "#ffffff" 
                          : isGreyed 
                            ? "#cbd5e1" 
                            : "#0f172a",
                        backgroundColor: (isStart || isEnd) 
                          ? "#0040b0" 
                          : "transparent",
                        "&:hover": {
                          backgroundColor: (isStart || isEnd) ? "#003390" : "#f1f5f9"
                        }
                      }}
                    >
                      {day.getDate()}
                    </Button>
                  </Grid>
                );
              })}
            </Grid>

            {/* Actions panel */}
            <Box mt={3} pt={2} display="flex" justifyContent="space-between" borderTop="1px solid #e2e8f0">
              <Button 
                onClick={handleClear} 
                color="error" 
                size="small" 
                sx={{ fontWeight: 700, textTransform: "none" }}
              >
                Сбросить
              </Button>
              <Button 
                onClick={handleApply} 
                variant="contained" 
                size="small" 
                sx={{ 
                  bgcolor: "#0040b0", 
                  fontWeight: 700, 
                  textTransform: "none",
                  borderRadius: "8px",
                  px: 2,
                  "&:hover": { bgcolor: "#003390" }
                }}
              >
                Применить
              </Button>
            </Box>
          </Box>
        </Stack>
      </Popover>
    </Box>
  );
};
