import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function RecepcionPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/admin/reception", { replace: true }); }, [navigate]);
  return null;
}
