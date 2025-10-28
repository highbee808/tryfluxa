import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to onboarding on first load
    navigate("/onboarding");
  }, [navigate]);

  return null;
};

export default Index;
