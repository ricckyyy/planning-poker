import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customAlphabet } from 'nanoid';

const generateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

export default function Home() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`/rooms/${generateId()}`, { replace: true });
  }, [navigate]);
  return null;
}
