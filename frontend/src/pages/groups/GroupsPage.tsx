import React, { useState } from "react";
import {
  Box, Typography, CircularProgress, Alert, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Card, CardContent,
  IconButton, Tooltip
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import AddIcon from "@mui/icons-material/Add";
import SchoolIcon from "@mui/icons-material/School";
import BookIcon from "@mui/icons-material/Book";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useAuth } from "../../App";
import { useData } from "../../contexts/DataContext";

export const GroupsPage: React.FC = () => {
  const { user } = useAuth();
  const { groups, students, addGroup, deleteGroup, loading, error } = useData();

  // Dialog state
  const [open, setOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCourse, setNewGroupCourse] = useState("Анатомия и гистология");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    await addGroup(newGroupName, newGroupCourse);
    setNewGroupName("");
    setNewGroupCourse("Анатомия и гистология");
    setOpen(false);
  };

  const handleDeleteGroup = async () => {
    if (!deleteConfirmId) return;
    await deleteGroup(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  // Подсчёт студентов в каждой группе из контекста
  const getStudentCount = (groupName: string) => {
    return students.filter(s => s.group_name === groupName).length;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={10}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", py: 2 }}>
      {/* Edge-aligned Header and Actions */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
          {isTeacher ? "Студенческие группы" : "Моя академическая группа"}
        </Typography>

        {isTeacher && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{
              bgcolor: "#0040b0",
              color: "#ffffff",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "8px",
              "&:hover": { bgcolor: "#003390" }
            }}
          >
            Создать группу
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {isTeacher ? (
        <Grid container spacing={3}>
          {groups.map((group) => (
            <Grid item xs={12} md={6} key={group.id}>
              <Card sx={{ border: "1px solid #e2e8f0", boxShadow: "none", borderRadius: "12px" }}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Box sx={{ bgcolor: "rgba(0, 64, 176, 0.08)", p: 1, borderRadius: "8px", color: "#0040b0" }}>
                        <GroupIcon />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                          {group.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748b" }}>
                          {getStudentCount(group.name)} студент(ов)
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box>
                        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, display: "block", textAlign: "right" }}>
                          АКТИВНОСТЬ
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a", textAlign: "right" }}>
                          {group.total_attempts} попыток
                        </Typography>
                      </Box>
                      <Tooltip title="Удалить группу">
                        <IconButton
                          size="small"
                          onClick={() => setDeleteConfirmId(group.id)}
                          sx={{ color: "#94a3b8", "&:hover": { color: "#ef4444" } }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Typography variant="body2" sx={{ color: "#64748b", mb: 2.5, display: "flex", alignItems: "center", gap: 1 }}>
                    <BookIcon sx={{ fontSize: 18 }} /> {group.course_title || group.description || "—"}
                  </Typography>

                  <Grid container spacing={2} sx={{ pt: 2, borderTop: "1px solid #f1f5f9" }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                        Средний балл
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: "#0040b0" }}>
                        {group.average_score}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                        Успеваемость (Pass Rate)
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: "#10b981" }}>
                        {group.pass_rate}%
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {groups.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ py: 8, textAlign: "center", color: "#64748b" }}>
                <GroupIcon sx={{ fontSize: 48, mb: 2, color: "#cbd5e1" }} />
                <Typography variant="body1">Нет групп. Создайте первую группу.</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      ) : (
        <Card sx={{ border: "1px solid #e2e8f0", boxShadow: "none", borderRadius: "12px", maxWidth: 600 }}>
          <CardContent sx={{ p: 4 }}>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Box sx={{ bgcolor: "rgba(0, 64, 176, 0.08)", p: 1.5, borderRadius: "10px", color: "#0040b0" }}>
                <GroupIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
                  {groups[0]?.name || "Группа A"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  Направление: Биомедицина
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
              <Box display="flex" justifyContent="space-between" sx={{ borderBottom: "1px solid #f1f5f9", pb: 1.5 }}>
                <Typography variant="body2" sx={{ color: "#64748b" }}>Курс обучения</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>{groups[0]?.course_title || "1 курс"}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" sx={{ borderBottom: "1px solid #f1f5f9", pb: 1.5 }}>
                <Typography variant="body2" sx={{ color: "#64748b" }}>Средний балл группы</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "#0040b0" }}>{groups[0]?.average_score || 84.5}%</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" sx={{ pb: 0.5 }}>
                <Typography variant="body2" sx={{ color: "#64748b" }}>Сдано экзаменов</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "#10b981" }}>{groups[0]?.total_attempts || 2} попыток</Typography>
              </Box>
            </Box>

            <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: "8px", display: "flex", alignItems: "center", gap: 1.5 }}>
              <SchoolIcon sx={{ color: "#0040b0" }} />
              <Typography variant="body2" sx={{ color: "#475569", fontWeight: 600 }}>
                Вы зачислены в эту группу. Оценки и экзамены назначаются автоматически.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Create Group Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800, fontSize: "1.15rem", pb: 1 }}>Создание новой группы</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1.5 }}>
            <TextField
              label="Название группы"
              placeholder="напр. Группа В"
              fullWidth
              variant="outlined"
              size="small"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <TextField
              label="Академический курс"
              placeholder="напр. Гистология органов"
              fullWidth
              variant="outlined"
              size="small"
              value={newGroupCourse}
              onChange={(e) => setNewGroupCourse(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}>
            Отмена
          </Button>
          <Button
            onClick={handleCreateGroup}
            variant="contained"
            sx={{
              bgcolor: "#0040b0",
              color: "#ffffff",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "8px",
              "&:hover": { bgcolor: "#003390" }
            }}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800, fontSize: "1.1rem" }}>Удалить группу?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#475569" }}>
            Студенты этой группы будут переведены в «Без группы». Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteConfirmId(null)} sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}>
            Отмена
          </Button>
          <Button
            onClick={handleDeleteGroup}
            variant="contained"
            sx={{
              bgcolor: "#ef4444",
              color: "#ffffff",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "8px",
              "&:hover": { bgcolor: "#dc2626" }
            }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupsPage;
