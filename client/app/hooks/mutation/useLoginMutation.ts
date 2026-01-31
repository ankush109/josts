import { useMutation } from "@tanstack/react-query";
import { API } from "../client";
import { ENDPOINTS } from "../endpoints";
import { toast } from "sonner";


export const login = async (userData: any) => {
  const response = await API.post(ENDPOINTS.LOGIN(), userData);
  return response.data;
};

export const useLoginMutation = () => {
  return useMutation({
    mutationFn: login
  });
};