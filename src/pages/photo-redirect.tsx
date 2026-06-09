import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Loader2 } from "lucide-react";

/**
 * Intermediate page that resolves a photo ID to the correct gallery URL.
 * Used by notification deep-links: /photos/:photoId
 * - Event photo  → /events/:eventId/photos?photo=:photoId
 * - Profile photo → /profile/:userId/photos?photo=:photoId
 */
export default function PhotoRedirectPage() {
  const { photoId } = useParams<{ photoId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!photoId) {
      navigate("/", { replace: true });
      return;
    }

    api.get(`/photos/${photoId}`)
      .then((res) => {
        const photo = res.data?.data?.photo;
        if (!photo) {
          navigate("/", { replace: true });
          return;
        }
        if (photo.event_id) {
          navigate(`/events/${photo.event_id}/photos?photo=${photoId}`, { replace: true });
        } else {
          navigate(`/profile/${photo.user_id}/photos?photo=${photoId}`, { replace: true });
        }
      })
      .catch(() => {
        navigate("/", { replace: true });
      });
  }, [photoId, navigate]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
