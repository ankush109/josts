import { useMutation } from "@tanstack/react-query";
import { API } from "../client";
import { ENDPOINTS } from "../endpoints";


export const register = async (userData: any) => {
  const response = await API.post(ENDPOINTS.REGISTER(), userData);
  return response.data;
};

export const useRegisterMutation = () => {
  return useMutation({
    mutationFn: register,
    onError: (error) => {
      console.error("Error adding task:", error);
    },
  });
};