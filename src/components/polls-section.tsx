import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  CheckCircle2, 
  Users, 
  PieChart,
  Calendar,
  ChevronRight,
  Vote,
  User,
  Send,
  RefreshCw,
  MessageSquare,
  Image as ImageIcon,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useStudentProfile } from "@/lib/use-student-profile";
import { 
  Poll, 
  PollVote, 
  fetchAllPolls, 
  fetchPollVotes, 
  submitPollVote,
  withdrawPollVote 
} from "@/lib/polls";

// Helper for dynamic names
const getDynamicGuestName = () => {
  const stored = localStorage.getItem("guest_name");
  if (stored) return stored;
  return "";
};

function PollCard({ 
  poll, 
  studentId, 
  studentName: initialStudentName, 
  votedValue, 
  votes, 
  onVote,
  onWithdraw,
  isWithdrawing
}: { 
  poll: Poll; 
  studentId: string; 
  studentName: string; 
  votedValue?: any; 
  votes: PollVote[]; 
  onVote: (pollId: number, data: { indices?: number[], text?: string, name: string }) => Promise<void>;
  onWithdraw: (pollId: number, name: string) => Promise<void>;
  isWithdrawing?: boolean;
}) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [voterName, setVoterName] = useState(initialStudentName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasVoted = votedValue !== undefined;
  const options = Array.isArray(poll.options) ? poll.options : JSON.parse(poll.options as string);
  
  const results = poll.type === "choice" ? options.map((opt: string, index: number) => {
    const count = votes.filter(v => v.optionIndex === index).length;
    const percentage = votes.length > 0 ? Math.round((count / votes.length) * 100) : 0;
    return { text: opt, count, percentage };
  }) : [];

  const handleToggleOption = (index: number) => {
    if (hasVoted) return;
    
    if (poll.allowMultiple) {
      if (selectedIndices.includes(index)) {
        setSelectedIndices(selectedIndices.filter(i => i !== index));
      } else {
        setSelectedIndices([...selectedIndices, index]);
      }
    } else {
      setSelectedIndices([index]);
    }
  };

  const handleSubmit = async () => {
    if (poll.type === "choice" && selectedIndices.length === 0) return;
    if (poll.type === "text" && !textAnswer.trim()) return;
    if (!voterName.trim()) return;

    setIsSubmitting(true);
    await onVote(poll.id, { 
      indices: poll.type === "choice" ? selectedIndices : undefined, 
      text: poll.type === "text" ? textAnswer.trim() : undefined,
      name: voterName.trim() 
    });
    setIsSubmitting(false);
  };

  const isUserChoice = (index: number) => {
    if (Array.isArray(votedValue)) {
      return votedValue.includes(index);
    }
    return votedValue === index;
  };

  const showResults = hasVoted && (poll.isPublic || false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-3xl bg-card border border-border/70 shadow-xs hover:shadow-md transition-all h-full flex flex-col"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-2xl ${poll.status === 'active' ? 'bg-primary' : 'bg-muted'} text-white shadow-lg shadow-primary/10`}>
          {poll.type === "text" ? <MessageSquare className="h-5 w-5" /> : <Vote className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm sm:text-base leading-tight mb-1">{poll.question}</h3>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold">
              <Users className="h-3 w-3" />
              {votes.length} مشارك
            </span>
            {poll.allowMultiple && poll.type === "choice" && (
              <Badge variant="secondary" className="text-[9px] px-1.5 h-4 font-bold bg-primary/10 text-primary border-none">
                خيارات متعددة
              </Badge>
            )}
            {!poll.isPublic && (
              <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-bold border-amber-500/30 text-amber-600">
                نتائج خاصة
              </Badge>
            )}
          </div>
        </div>
      </div>

      {poll.imageUrl && (
        <div className="mb-4 rounded-2xl overflow-hidden aspect-video border border-border/50 group/img relative">
          <img src={poll.imageUrl} alt="Poll" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/img:opacity-100 transition-opacity" />
        </div>
      )}

      <div className="space-y-2 mb-4">
        {poll.type === "choice" ? (
          results.map((res: any, i: number) => {
            const isSelected = selectedIndices.includes(i) || isUserChoice(i);
            return (
              <button
                key={i}
                disabled={hasVoted}
                onClick={() => handleToggleOption(i)}
                className={`relative w-full text-right p-3.5 rounded-2xl border transition-all overflow-hidden group ${
                  hasVoted 
                    ? isUserChoice(i) 
                      ? "border-primary/50 bg-primary/5" 
                      : "border-border/50 bg-muted/20"
                    : isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-primary/[0.01] active:scale-[0.99]"
                }`}
              >
                {/* Background Progress Bar */}
                {showResults && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${res.percentage}%` }}
                    className={`absolute inset-y-0 right-0 z-0 opacity-10 ${isUserChoice(i) ? 'bg-primary' : 'bg-muted-foreground'}`}
                  />
                )}

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected 
                        ? "border-primary bg-primary text-white" 
                        : "border-muted-foreground/30"
                    }`}>
                      {isSelected && <CheckCircle2 className="h-3 w-3" />}
                    </div>
                    <span className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-foreground/80'}`}>
                      {res.text}
                    </span>
                  </div>
                  
                  {showResults && (
                    <span className="text-xs font-black text-primary">
                      {res.percentage}%
                    </span>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="space-y-3">
            {hasVoted ? (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-2">
                <p className="text-[10px] font-black text-primary">إجابتك المسجلة:</p>
                <p className="text-sm font-bold leading-relaxed">{String(votedValue)}</p>
              </div>
            ) : (
              <textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="اكتب إجابتك هنا..."
                className="w-full p-4 rounded-2xl bg-muted/30 border-none focus:ring-2 focus:ring-primary/20 text-sm font-bold min-h-[100px] resize-none"
              />
            )}
          </div>
        )}
      </div>

      {!hasVoted ? (
        <div className="mt-auto pt-4 border-t border-border/50 space-y-3">
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              placeholder="اكتب اسمك للمشاركة..."
              className="rounded-xl h-11 pr-10 text-sm font-bold bg-muted/30 border-none focus-visible:ring-primary/30"
            />
          </div>
          <Button 
            onClick={handleSubmit}
            disabled={
              (poll.type === "choice" ? selectedIndices.length === 0 : !textAnswer.trim()) || 
              !voterName.trim() || isSubmitting
            }
            className="w-full rounded-2xl h-11 font-bold shadow-lg shadow-primary/20"
          >
            {isSubmitting ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Send className="h-4 w-4 ml-2" />
                تأكيد التصويت
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="mt-auto pt-4 border-t border-border/50 space-y-3">
          <p className="text-[10px] text-center text-muted-foreground font-bold italic">
            تم تسجيل صوتك بنجاح! شكراً لمشاركتك يا {voterName}.
          </p>
          {!poll.preventWithdraw && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onWithdraw(poll.id, voterName)}
              disabled={isWithdrawing}
              className="w-full rounded-2xl h-10 text-xs font-black border-destructive/40 text-destructive bg-destructive/10 hover:bg-destructive/20 hover:border-destructive transition-all shadow-sm"
            >
              {isWithdrawing ? (
                <div className="animate-spin h-4 w-4 border-2 border-destructive border-t-transparent rounded-full" />
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 ml-2" />
                  سحب التصويت أو تغييره ⚠️
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function PollsSection() {
  const { toast } = useToast();
  const { profile } = useStudentProfile();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedPolls, setVotedPolls] = useState<Record<number, any>>({}); 
  const [pollStats, setPollStats] = useState<Record<number, PollVote[]>>({});

  const studentName = profile?.displayName || profile?.fullName || profile?.name || getDynamicGuestName();
  const studentId = profile?.uid || "";

  useEffect(() => {
    loadData();
  }, [studentId, studentName]);

  const loadData = async () => {
    setLoading(true);
    const allPolls = await fetchAllPolls();
    setPolls(allPolls.filter(p => p.status === 'active'));
    
    // Check local storage for backup
    const localVotes = JSON.parse(localStorage.getItem("student_votes_v3") || "{}");
    
    const stats: Record<number, PollVote[]> = {};
    const finalVotedMap: Record<number, any> = { ...localVotes };

    for (const poll of allPolls) {
      if (poll.status === 'active') {
        const votes = await fetchPollVotes(poll.id);
        stats[poll.id] = votes;
        
        // Find my votes in DB (more reliable)
        const myVotes = votes.filter(v => (v.userId && studentId && v.userId === studentId) || v.userName === studentName);
        if (myVotes.length > 0) {
          if (poll.type === "text") {
            finalVotedMap[poll.id] = myVotes[0].textAnswer || "";
          } else {
            const indices = myVotes.map(v => v.optionIndex!).filter(v => v !== undefined);
            finalVotedMap[poll.id] = poll.allowMultiple ? indices : indices[0];
          }
        }
      }
    }
    
    localStorage.setItem("student_votes_v3", JSON.stringify(finalVotedMap));
    setVotedPolls(finalVotedMap);
    setPollStats(stats);
    setLoading(false);
  };

  const handleVoteSubmission = async (pollId: number, data: { indices?: number[], text?: string, name: string }) => {
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;

    if (!studentName && !data.name) {
      toast({ title: "تنبيه", description: "يرجى كتابة اسمك أولاً", variant: "destructive" });
      return;
    }
    
    // Save name if guest
    if (!profile && data.name) {
      localStorage.setItem("guest_name", data.name);
    }

    let success = false;
    let successfulVotes: PollVote[] = [];

    if (poll.type === "choice" && data.indices) {
      const results = await Promise.all(
        data.indices.map(idx => submitPollVote(pollId, {
          userId: studentId,
          userName: data.name,
          optionIndex: idx
        }))
      );
      successfulVotes = results.filter((r): r is PollVote => r !== null);
      success = successfulVotes.length > 0;
    } else if (poll.type === "text" && data.text) {
      const result = await submitPollVote(pollId, {
        userId: studentId,
        userName: data.name,
        textAnswer: data.text
      });
      if (result) {
        successfulVotes = [result];
        success = true;
      }
    }

    if (success) {
      const voteValue = poll.type === "text" ? data.text! : (poll.allowMultiple ? data.indices! : data.indices![0]);
      const updatedVotes = { ...votedPolls, [pollId]: voteValue };
      setVotedPolls(updatedVotes);
      localStorage.setItem("student_votes_v3", JSON.stringify(updatedVotes));
      
      setPollStats(prev => ({
        ...prev,
        [pollId]: [...(prev[pollId] || []), ...successfulVotes]
      }));
      
      toast({ title: "تم تسجيل مشاركتك بنجاح!" });
    }
  };

  const [isWithdrawing, setIsWithdrawing] = useState<number | null>(null);

  const handleWithdrawVote = async (pollId: number, name: string) => {
    console.log("Withdrawing vote for poll:", pollId, "name:", name);
    setIsWithdrawing(pollId);
    try {
      const res = await withdrawPollVote(pollId, name, studentId);
      console.log("Withdraw result:", res);
      if (res.success) {
        const updatedVotes = { ...votedPolls };
        delete updatedVotes[pollId];
        setVotedPolls(updatedVotes);
        localStorage.setItem("student_votes_v3", JSON.stringify(updatedVotes));
        
        // Reload stats
        const votes = await fetchPollVotes(pollId);
        setPollStats(prev => ({ ...prev, [pollId]: votes }));
        
        toast({ title: "تم سحب التصويت بنجاح" });
      } else {
        toast({ title: res.error || "فشل سحب التصويت", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Withdrawal error:", err);
      toast({ title: "حدث خطأ أثناء سحب التصويت", description: err.message, variant: "destructive" });
    } finally {
      setIsWithdrawing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (polls.length === 0) return null;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <PieChart className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-black tracking-tight">استطلاعات الرأي والتصويت</h2>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={loadData}
          disabled={loading}
          className="rounded-xl h-9 w-9 text-muted-foreground hover:text-primary"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {polls.map((poll) => (
          <PollCard 
            key={poll.id}
            poll={poll}
            studentId={studentId}
            studentName={studentName}
            votedValue={votedPolls[poll.id]}
            votes={pollStats[poll.id] || []}
            onVote={handleVoteSubmission}
            onWithdraw={handleWithdrawVote}
            isWithdrawing={isWithdrawing === poll.id}
          />
        ))}
      </div>
    </div>
  );
}
