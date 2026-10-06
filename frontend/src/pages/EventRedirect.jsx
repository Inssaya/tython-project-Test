import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Legacy /events/:id links (e.g. from the Dashboard) now open the event as a
// popup on the events list instead of a dedicated page.
export default function EventRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/events', { replace: true, state: { openEventId: id } });
  }, [id, navigate]);

  return null;
}
