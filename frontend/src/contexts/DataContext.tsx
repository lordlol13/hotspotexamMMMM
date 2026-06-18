import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";

import { useAuth } from "../App";


export interface GroupData {
  id: string;
  name: string;
  description: string;
  course_title: string;
  student_count: number;
  average_score: number;
  pass_rate: number;
  fail_rate: number;
  total_attempts: number;
}

export interface StudentData {
  id: string;
  name: string;
  email: string;
  group_name: string;
  group_id: string;
  average_score: number;
  completed_exams: number;
  hide_grades?: boolean;
}

interface DataContextType {
  groups: GroupData[];
  students: StudentData[];
  loading: boolean;
  error: string | null;
  addGroup: (name: string, courseTitle: string, description?: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  updateStudentGroup: (studentId: string, groupId: string | null, groupName: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    setError(null);

    try {
      const isTeacher = user.role === "teacher" || user.role === "admin";
      const groupsUrl = isTeacher ? "/api/v1/groups/" : "/api/v1/groups/public";
      const requests: Promise<any>[] = [axios.get(groupsUrl), axios.get("/api/v1/students/")];
      if (isTeacher) requests.push(axios.get("/api/v1/analytics/teacher"));

      const [groupsResponse, studentsResponse, analyticsResponse] = await Promise.all(requests);
      const apiGroups = groupsResponse.data || [];
      const apiStudents = studentsResponse.data || [];
      const groupStats = analyticsResponse?.data?.group_statistics || [];
      const studentRankings = analyticsResponse?.data?.student_rankings || [];

      setGroups(apiGroups.map((group: any) => {
        const stats = groupStats.find((item: any) => item.group_name === group.name);
        return {
          id: group.id,
          name: group.name,
          description: group.description || "",
          course_title: stats?.course_title || "",
          student_count: group.student_count ?? 0,
          average_score: stats?.average_score ?? 0,
          pass_rate: stats?.pass_rate ?? 0,
          fail_rate: stats?.fail_rate ?? 0,
          total_attempts: stats?.total_attempts ?? 0,
        };
      }));

      setStudents(apiStudents.map((student: any) => {
        const stats = studentRankings.find((item: any) => item.email === student.email);
        return {
          id: student.id,
          name: student.name,
          email: student.email,
          group_name: student.group_name || "Без группы",
          group_id: student.group_id || "",
          average_score: stats?.average_score ?? 0,
          completed_exams: stats?.completed_exams ?? 0,
          hide_grades: student.hide_grades,
        };
      }));
    } catch {
      setGroups([]);
      setStudents([]);
      if (!silent) setError("Не удалось загрузить данные с сервера.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchData(false);
    const timer = window.setInterval(() => fetchData(true), 60000);
    return () => window.clearInterval(timer);
  }, [user, fetchData]);

  const addGroup = useCallback(async (name: string, courseTitle: string, description?: string) => {
    const response = await axios.post("/api/v1/groups/", { name, description: description || "" });
    const group = response.data;
    setGroups((current) => [...current, {
      id: group.id,
      name: group.name,
      description: group.description || "",
      course_title: courseTitle,
      student_count: group.student_count ?? 0,
      average_score: 0,
      pass_rate: 0,
      fail_rate: 0,
      total_attempts: 0,
    }]);
  }, []);

  const deleteGroup = useCallback(async (groupId: string) => {
    await axios.delete(`/api/v1/groups/${groupId}`);
    setGroups((current) => current.filter((group) => group.id !== groupId));
    setStudents((current) => current.map((student) => student.group_id === groupId
      ? { ...student, group_name: "Без группы", group_id: "" }
      : student));
  }, []);

  const updateStudentGroup = useCallback(async (studentId: string, groupId: string | null, groupName: string) => {
    await axios.put(`/api/v1/students/${studentId}/group`, { group_id: groupId });
    setStudents((current) => current.map((student) => student.id === studentId
      ? { ...student, group_id: groupId || "", group_name: groupName || "Без группы" }
      : student));
  }, []);

  return (
    <DataContext.Provider value={{
      groups,
      students,
      loading,
      error,
      addGroup,
      deleteGroup,
      updateStudentGroup,
      refreshData: () => fetchData(false),
    }}>
      {children}
    </DataContext.Provider>
  );
};

export default DataProvider;
