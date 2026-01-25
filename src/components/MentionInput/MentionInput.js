import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  TextField,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Box,
} from '@mui/material';
import ProfileAvatar from 'components/ProfileAvatar';
import useClubContext from 'contexts/Club';

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
  const { clubMembers } = useClubContext();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(null);
  const [mentions, setMentions] = useState([]); // Array of {userId, displayName, start, end}
  const textFieldRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Search users based on query
  const searchUsers = useCallback((query) => {
    const allUsers = clubMembers?.map(member => member.user).filter(Boolean) || [];
    
    if (!query.trim()) {
      return allUsers.slice(0, 10); // Show first 10 users when no query
    }
    
    const searchTerm = query.toLowerCase().trim();
    return allUsers
      .filter(user => {
        const displayName = (user.displayName || user.email || '').toLowerCase();
        return displayName.includes(searchTerm);
      })
      .slice(0, 10); // Limit to 10 results
  }, [clubMembers]);

  // Handle text change and detect @ mentions
  const handleChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(e);

    // Find @ symbol before cursor
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    // Check if we're in a mention context
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const hasSpaceAfterAt = textAfterAt.includes(' ') || textAfterAt.includes('\n');
      
      if (!hasSpaceAfterAt) {
        // We're typing a mention
        setMentionStartPos(lastAtIndex);
        setShowSuggestions(true);
        setSelectedIndex(0);
        
        // Immediately search (no debounce for better UX)
        const results = searchUsers(textAfterAt);
        setSuggestions(results);
      } else {
        // Space found, close suggestions
        setShowSuggestions(false);
      }
    } else {
      // No @ before cursor
      setShowSuggestions(false);
    }
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
                  <ProfileAvatar
                    user={user}
                    size={32}
                    alt={user.displayName || user.email}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={user.displayName || user.email}
                  secondary={user.email && user.displayName ? user.email : null}
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
