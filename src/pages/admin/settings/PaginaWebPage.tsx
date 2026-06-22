import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PaginaWebPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/admin/website", { replace: true }); }, [navigate]);
  return null;
}
