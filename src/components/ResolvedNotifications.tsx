import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";

import { acknowledgeResolvedNotifications, unseenResolvedTickets } from "@/lib/student.functions";

export function ResolvedNotifications() {
  const navigate = useNavigate();
  const fetchUnseen = useServerFn(unseenResolvedTickets);
  const acknowledge = useServerFn(acknowledgeResolvedNotifications);

  const { data } = useQuery({
    queryKey: ["unseen-resolved-tickets"],
    queryFn: () => fetchUnseen(),
    staleTime: Infinity,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: () => acknowledge(),
  });

  useEffect(() => {
    if (!data || data.length === 0) return;
    for (const ticket of data) {
      toast.success(`আপনার সমস্যা "${ticket.title}" সমাধান হয়েছে!`, {
        description: ticket.ticket_number,
        duration: 8000,
        action: {
          label: "টিকেট দেখুন",
          onClick: () => navigate({ to: "/student/issues/$id", params: { id: ticket.id } }),
        },
      });
    }
    acknowledgeMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return null;
}
