import { createTheme } from "@mui/material/styles";

export const getAppTheme = (mode: "light" | "dark") => {
  const isDark = mode === "dark";
  return createTheme({
    palette: {
      mode: mode,
      primary: {
        main: "#0040b0",
        light: "#3b78e7",
        dark: "#003390",
        contrastText: "#ffffff",
      },
      secondary: {
        main: isDark ? "#f8fafc" : "#0f172a",
        light: isDark ? "#cbd5e1" : "#334155",
        dark: isDark ? "#94a3b8" : "#020617",
        contrastText: isDark ? "#0f172a" : "#ffffff",
      },
      success: {
        main: "#10b981",
        light: "#34d399",
        dark: "#047857",
      },
      warning: {
        main: "#f59e0b",
        light: "#fbbf24",
        dark: "#b45309",
      },
      error: {
        main: "#ef4444",
        light: "#f87171",
        dark: "#b91c1c",
      },
      info: {
        main: "#0ea5e9",
        light: "#38bdf8",
        dark: "#0369a1",
      },
      background: {
        default: isDark ? "#0b0f19" : "#f8fafc",
        paper: isDark ? "#111827" : "#ffffff",
      },
      text: {
        primary: isDark ? "#f9fafb" : "#0f172a",
        secondary: isDark ? "#9ca3af" : "#475569",
      },
      divider: isDark ? "#1f2937" : "#e2e8f0",
    },
    typography: {
      fontFamily: [
        "Inter",
        "-apple-system",
        "BlinkMacSystemFont",
        '"Segoe UI"',
        "Roboto",
        '"Helvetica Neue"',
        "Arial",
        "sans-serif",
      ].join(","),
      h1: {
        fontSize: "2.5rem",
        fontWeight: 800,
        letterSpacing: "-0.02em",
        lineHeight: 1.2,
        color: isDark ? "#f9fafb" : "#0f172a",
      },
      h2: {
        fontSize: "2rem",
        fontWeight: 800,
        letterSpacing: "-0.01em",
        lineHeight: 1.25,
        color: isDark ? "#f9fafb" : "#0f172a",
      },
      h3: {
        fontSize: "1.5rem",
        fontWeight: 700,
        letterSpacing: "-0.01em",
        lineHeight: 1.3,
        color: isDark ? "#f9fafb" : "#0f172a",
      },
      h4: {
        fontSize: "1.25rem",
        fontWeight: 700,
        lineHeight: 1.35,
        color: isDark ? "#f9fafb" : "#0f172a",
      },
      h5: {
        fontSize: "1.1rem",
        fontWeight: 600,
        lineHeight: 1.4,
        color: isDark ? "#f9fafb" : "#0f172a",
      },
      h6: {
        fontSize: "1rem",
        fontWeight: 600,
        lineHeight: 1.45,
        color: isDark ? "#f9fafb" : "#0f172a",
      },
      subtitle1: {
        fontSize: "0.95rem",
        fontWeight: 500,
        color: isDark ? "#cbd5e1" : "#475569",
      },
      subtitle2: {
        fontSize: "0.875rem",
        fontWeight: 500,
        color: isDark ? "#9ca3af" : "#64748b",
      },
      body1: {
        fontSize: "0.95rem",
        lineHeight: 1.6,
        color: isDark ? "#cbd5e1" : "#334155",
      },
      body2: {
        fontSize: "0.875rem",
        lineHeight: 1.5,
        color: isDark ? "#9ca3af" : "#475569",
      },
      button: {
        textTransform: "none",
        fontWeight: 600,
        letterSpacing: "0.01em",
      },
      overline: {
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: isDark ? "#9ca3af" : "#64748b",
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: "rgba(0, 64, 176, 0.2) transparent",
            backgroundColor: isDark ? "#0b0f19" : "#f8fafc",
            color: isDark ? "#f9fafb" : "#0f172a",
            "&::-webkit-scrollbar": {
              width: "6px",
              height: "6px",
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "rgba(0, 64, 176, 0.2)",
              borderRadius: "3px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: "rgba(0, 64, 176, 0.4)",
            },
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: "8px 20px",
            fontSize: "0.875rem",
            fontWeight: 600,
            transition: "all 0.2s ease",
            "&:hover": {
              transform: "translateY(-1px)",
            },
            "&:active": {
              transform: "none",
            },
          },
          contained: {
            background: "#0040b0",
            color: "#ffffff",
            "&:hover": {
              background: "#003390",
              boxShadow: "0 2px 8px rgba(0, 64, 176, 0.25)",
              transform: "translateY(-1px)",
            },
          },
          containedSecondary: {
            background: isDark ? "#1f2937" : "#0f172a",
            color: "#ffffff",
            "&:hover": {
              background: isDark ? "#374151" : "#020617",
              boxShadow: isDark ? "none" : "0 2px 8px rgba(15, 23, 42, 0.2)",
            },
          },
          outlined: {
            borderColor: isDark ? "#1f2937" : "#e2e8f0",
            color: isDark ? "#cbd5e1" : "#0f172a",
            "&:hover": {
              borderColor: isDark ? "#374151" : "#cbd5e1",
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
              transform: "translateY(-1px)",
            },
          },
          text: {
            color: isDark ? "#60a5fa" : "#0040b0",
            "&:hover": {
              backgroundColor: isDark ? "rgba(96, 165, 250, 0.08)" : "rgba(0, 64, 176, 0.04)",
              transform: "translateY(-1px)",
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: isDark ? "#111827" : "#ffffff",
            border: isDark ? "1px solid #1f2937" : "1px solid #e2e8f0",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
            transition: "all 0.2s ease",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: isDark ? "#111827" : "#ffffff",
            border: isDark ? "1px solid #1f2937" : "1px solid #e2e8f0",
            borderRadius: 12,
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
            transition: "all 0.2s ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
              borderColor: isDark ? "#374151" : "#cbd5e1",
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: "20px",
            "&:last-child": {
              paddingBottom: "20px",
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 600,
            fontSize: "0.75rem",
            transition: "all 0.2s ease",
          },
          filled: {
            backgroundColor: isDark ? "#1f2937" : "#f1f5f9",
            color: isDark ? "#cbd5e1" : "#475569",
            "&:hover": {
              backgroundColor: isDark ? "#374151" : "#e2e8f0",
            },
          },
          outlined: {
            borderColor: isDark ? "#1f2937" : "#e2e8f0",
            "&:hover": {
              borderColor: isDark ? "#374151" : "#cbd5e1",
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: isDark ? "1px solid #1f2937" : "1px solid #e2e8f0",
            padding: "12px 16px",
            color: isDark ? "#cbd5e1" : "#334155",
          },
          head: {
            fontWeight: 700,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: isDark ? "#9ca3af" : "#475569",
            backgroundColor: isDark ? "#0b0f19" : "#f8fafc",
            borderBottom: isDark ? "2px solid #1f2937" : "2px solid #e2e8f0",
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: "background-color 0.15s ease",
            "&:hover": {
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.02) !important" : "#f8fafc !important",
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 8,
              backgroundColor: isDark ? "#0b0f19" : "#ffffff",
              transition: "all 0.2s ease",
              "& fieldset": {
                borderColor: isDark ? "#1f2937" : "#e2e8f0",
                transition: "all 0.2s ease",
              },
              "&:hover fieldset": {
                borderColor: isDark ? "#374151" : "#cbd5e1",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#0040b0",
                borderWidth: "1px",
              },
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: isDark ? "#111827" : "#ffffff",
            borderBottom: isDark ? "1px solid #1f2937" : "1px solid #e2e8f0",
            boxShadow: "none",
            color: isDark ? "#f9fafb" : "#0f172a",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? "#111827" : "#ffffff",
            borderRight: isDark ? "1px solid #1f2937" : "1px solid #e2e8f0",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: "none",
            backgroundColor: isDark ? "#111827" : "#ffffff",
            border: isDark ? "1px solid #1f2937" : "1px solid #e2e8f0",
            borderRadius: 12,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: "#1e293b",
            color: "#ffffff",
            borderRadius: 6,
            fontSize: "0.75rem",
            padding: "6px 10px",
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            height: 6,
            backgroundColor: isDark ? "#1f2937" : "#e2e8f0",
          },
          bar: {
            borderRadius: 4,
            background: "#0040b0",
          },
        },
      },
      MuiCircularProgress: {
        styleOverrides: {
          root: {
            color: "#0040b0",
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: isDark ? "#1f2937" : "#e2e8f0",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: "2px 8px",
            transition: "all 0.15s ease",
            "&:hover": {
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
            },
            "&.Mui-selected": {
              backgroundColor: isDark ? "rgba(0, 64, 176, 0.2)" : "#e0f2fe",
              color: isDark ? "#60a5fa" : "#0369a1",
              "&:hover": {
                backgroundColor: isDark ? "rgba(0, 64, 176, 0.3)" : "#bae6fd",
              },
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 2,
            background: "#0040b0",
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.875rem",
            color: isDark ? "#9ca3af" : "#64748b",
            "&.Mui-selected": {
              color: isDark ? "#60a5fa" : "#0040b0",
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            "&.Mui-checked": {
              color: "#0040b0",
              "& + .MuiSwitch-track": {
                backgroundColor: "#0040b0",
                opacity: 0.4,
              },
            },
          },
          track: {
            borderRadius: 10,
            backgroundColor: isDark ? "#374151" : "#cbd5e1",
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            border: "1px solid",
          },
          standardSuccess: {
            backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#f0fdf4",
            borderColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#bbf7d0",
            color: isDark ? "#34d399" : "#166534",
          },
          standardError: {
            backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "#fef2f2",
            borderColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#fecaca",
            color: isDark ? "#f87171" : "#991b1b",
          },
          standardWarning: {
            backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "#fffbeb",
            borderColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#fef3c7",
            color: isDark ? "#fbbf24" : "#92400e",
          },
          standardInfo: {
            backgroundColor: isDark ? "rgba(14, 165, 233, 0.1)" : "#f0f9ff",
            borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "#bae6fd",
            color: isDark ? "#38bdf8" : "#075985",
          },
        },
      },
    },
  });
};

export const theme = getAppTheme("light");
