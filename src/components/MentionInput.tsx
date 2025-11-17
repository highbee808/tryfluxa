import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface UserSuggestion {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export function MentionInput({ value, onChange, placeholder, className }: MentionInputProps) {
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mentionQuery.length > 0) {
      searchUsers(mentionQuery);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [mentionQuery]);

  const searchUsers = async (query: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .ilike("display_name", `%${query}%`)
      .limit(5);

    if (!error && data) {
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Check if we're typing a mention
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
    } else {
      setMentionQuery("");
      setShowSuggestions(false);
    }
  };

  const insertMention = (user: UserSuggestion) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    
    // Replace the @query with @username
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index);
      const newValue = `${beforeMention}@${user.display_name} ${textAfterCursor}`;
      onChange(newValue);
      
      // Set cursor position after the mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = beforeMention.length + user.display_name.length + 2;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      }, 0);
    }

    setShowSuggestions(false);
    setMentionQuery("");
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && suggestions.length > 0) {
      e.preventDefault();
      insertMention(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative w-full">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("min-h-[80px]", className)}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((user, index) => (
            <button
              key={user.user_id}
              onClick={() => insertMention(user)}
              className={cn(
                "w-full px-4 py-2 text-left hover:bg-secondary/50 transition-colors flex items-center gap-2",
                index === selectedIndex && "bg-secondary"
              )}
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                {user.display_name?.substring(0, 2).toUpperCase() || "U"}
              </div>
              <span className="text-sm">@{user.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
