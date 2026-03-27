import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  TextField,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Box,
  Avatar,
} from '@mui/material';
import { Groups as GroupsIcon } from '@mui/icons-material';
import ProfileAvatar from 'components/ProfileAvatar';
import useClubContext from 'contexts/Club';
import { EVERYONE_MENTION_USER_ID } from 'utils/mentionHelpers';

const EVERYONE_PICK_USER = {
  uid: EVERYONE_MENTION_USER_ID,
  displayName: 'everyone',
  email: null,
};

/**
 * MentionInput - A text input component that supports @mentions with searchable dropdown
 * 
 * Features:
 * - Type @ to trigger mention dropdown
 * - Search users by name as you type
 * - Arrow keys to navigate suggestions
 * - Enter/Tab to select
 * - Esc to close
 * - Stores mention metadata for parsing later
 */
const MentionInput = ({
  value,
  onChange,
  onMentionsChange,
  placeholder = 'Message...',
  multiline = true,
  maxRows = 4,
  disabled = false,
  autoFocus = false,
  onKeyPress,
  inputRef,
  ...props
}) => {
  const { clubMembers, currentClub } = useClubContext();
  const canUseEveryoneMention = ['owner', 'admin'].includes(currentClub?.role);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(null);
  const [mentions, setMentions] = useState([]); // Array of {userId, displayName, start, end}
  const textFieldRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Search users based on query; @everyone for owners/admins only
  const searchUsers = useCallback((query) => {
    const allUsers = clubMembers?.map(member => member.user).filter(Boolean) || [];
    const q = query.toLowerCase().trim();
    const userCap = canUseEveryoneMention ? 9 : 10;

    let userResults;
    if (!q) {
      userResults = allUsers.slice(0, userCap);
    } else {
      userResults = allUsers
        .filter((user) => {
          const displayName = (user.displayName || user.email || '').toLowerCase();
          return displayName.includes(q);
        })
        .slice(0, userCap);
    }

    const showEveryone =
      canUseEveryoneMention && (q.length === 0 || 'everyone'.startsWith(q));
    if (!showEveryone) {
      return userResults;
    }

    return [EVERYONE_PICK_USER, ...userResults.filter((u) => u.uid !== EVERYONE_MENTION_USER_ID)].slice(
      0,
      10,
    );
  }, [clubMembers, canUseEveryoneMention]);

  // Shared: caret + value -> mention dropdown state (used by onChange and when value updates without a synthetic change event, e.g. @ toolbar button)
  const applyMentionStateAtCaret = useCallback(
    (newValue, cursorPos) => {
      const pos = cursorPos ?? newValue.length;
      const textBeforeCursor = newValue.slice(0, pos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        const hasSpaceAfterAt = textAfterAt.includes(' ') || textAfterAt.includes('\n');

        if (!hasSpaceAfterAt) {
          setMentionStartPos(lastAtIndex);
          setShowSuggestions(true);
          setSelectedIndex(0);
          setSuggestions(searchUsers(textAfterAt));
          return;
        }
      }
      setShowSuggestions(false);
    },
    [searchUsers],
  );

  // Programmatic @ insert (parent setState) does not fire React onChange; defer past parent setTimeout(0) that moves the caret
  useEffect(() => {
    const input = textFieldRef.current;
    if (!input) return;

    const id = window.setTimeout(() => {
      if (document.activeElement !== input) return;
      const cursorPos = input.selectionStart ?? value.length;
      applyMentionStateAtCaret(value, cursorPos);
    }, 0);

    return () => window.clearTimeout(id);
  }, [value, applyMentionStateAtCaret]);

  // Handle text change and detect @ mentions
  const handleChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    onChange(e);

    applyMentionStateAtCaret(newValue, cursorPos);
  };

  // Insert mention when user selects from dropdown
  const insertMention = useCallback((user) => {
    if (mentionStartPos === null) return;

    const cursorPos = textFieldRef.current?.selectionStart || value.length;
    const beforeMention = value.slice(0, mentionStartPos);
    const afterCursor = value.slice(cursorPos);
    
    // Create mention text like "@John Doe"
    const mentionText = `@${user.displayName || user.email}`;
    const newValue = beforeMention + mentionText + ' ' + afterCursor;
    
    // Calculate new mention position
    const mentionEnd = mentionStartPos + mentionText.length;
    
    // Update mentions array
    const newMention = {
      userId: user.uid,
      displayName: user.displayName || user.email,
      start: mentionStartPos,
      end: mentionEnd,
    };
    
    const updatedMentions = [...mentions, newMention];
    setMentions(updatedMentions);
    
    // Notify parent of mentions change
    if (onMentionsChange) {
      // Use setTimeout to avoid state update during render
      setTimeout(() => {
        onMentionsChange(updatedMentions);
      }, 0);
    }

    // Update text value
    const syntheticEvent = {
      target: {
        value: newValue,
        name: props.name,
      },
    };
    onChange(syntheticEvent);

    // Close suggestions
    setShowSuggestions(false);
    setMentionStartPos(null);

    // Set cursor after mention
    setTimeout(() => {
      if (textFieldRef.current) {
        const newCursorPos = mentionEnd + 1; // +1 for the space after mention
        textFieldRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textFieldRef.current.focus();
      }
    }, 0);
  }, [mentionStartPos, value, mentions, onChange, onMentionsChange, props.name]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
        }
        break;
      case 'Tab':
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
      default:
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (showSuggestions && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex, showSuggestions]);

  const handleKeyPress = (e) => {
    // Don't interfere with mention selection
    if (showSuggestions && e.key === 'Enter') {
      return;
    }
    if (onKeyPress) {
      onKeyPress(e);
    }
  };

  return (
    <Box sx={{ position: 'relative', flex: 1 }}>
      <TextField
        inputRef={(ref) => {
          textFieldRef.current = ref;
          if (inputRef) {
            if (typeof inputRef === 'function') {
              inputRef(ref);
            } else {
              inputRef.current = ref;
            }
          }
        }}
        fullWidth
        multiline={multiline}
        maxRows={maxRows}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyPress={handleKeyPress}
        disabled={disabled}
        autoFocus={autoFocus}
        variant="outlined"
        size="small"
        {...props}
      />
      
      {/* Mention suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            mb: 0.5,
            maxHeight: 300,
            overflowY: 'auto',
            zIndex: 1300,
          }}
        >
          <List ref={suggestionsRef} dense>
            {suggestions.map((user, index) => (
              <ListItem
                key={user.uid}
                button
                selected={index === selectedIndex}
                onClick={() => insertMention(user)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                  },
                  '&.Mui-selected:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemAvatar>
                  {user.uid === EVERYONE_MENTION_USER_ID ? (
                    <Avatar sx={{ width: 32, height: 32 }}>
                      <GroupsIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                  ) : (
                    <ProfileAvatar
                      user={user}
                      size={32}
                      alt={user.displayName || user.email}
                    />
                  )}
                </ListItemAvatar>
                <ListItemText
                  primary={user.uid === EVERYONE_MENTION_USER_ID ? '@everyone' : user.displayName || user.email}
                  secondary={
                    user.uid === EVERYONE_MENTION_USER_ID
                      ? 'Notify all club members'
                      : user.email && user.displayName
                        ? user.email
                        : null
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default MentionInput;
