import React, { useMemo } from 'react';
import { Box, Typography, Tooltip as MUITooltip } from '@mui/material';

const ParticipationHeatmap = ({ participationHeatmap }) => {
  const { heatmapData, maxEntryCount, weekLabels } = useMemo(() => {
    if (!participationHeatmap || participationHeatmap.length === 0) {
      return { heatmapData: [], maxEntryCount: 0, weekLabels: [] };
    }

    // Get all unique members
    const memberMap = new Map();
    participationHeatmap.forEach((week) => {
      week.members.forEach((member) => {
        if (!memberMap.has(member.userId)) {
          memberMap.set(member.userId, {
            userId: member.userId,
            name: member.user.displayName || 'Unknown',
            entries: [],
          });
        }
      });
    });

    // Collect entry counts for each member across all weeks
    participationHeatmap.forEach((week) => {
      week.members.forEach((member) => {
        const memberData = memberMap.get(member.userId);
        if (memberData) {
          memberData.entries.push(member.entryCount || 0);
        }
      });
    });

    // Find max entry count for color scaling
    let maxCount = 0;
    memberMap.forEach((member) => {
      const memberMax = Math.max(...member.entries, 0);
      maxCount = Math.max(maxCount, memberMax);
    });

    // Generate week labels
    const labels = participationHeatmap.map((week, index) => {
      const date = new Date(week.weekStart);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    return {
      heatmapData: Array.from(memberMap.values()),
      maxEntryCount: maxCount,
      weekLabels: labels,
    };
  }, [participationHeatmap]);

  const getColorIntensity = (entryCount) => {
    if (maxEntryCount === 0) return '#f0f0f0';
    const intensity = entryCount / maxEntryCount;
    // Use a color scale from light blue (#87CEEB) to dark blue (#1E90FF)
    const r = Math.floor(135 + (30 - 135) * intensity);
    const g = Math.floor(206 + (144 - 206) * intensity);
    const b = Math.floor(235 + (255 - 235) * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  };

  if (!participationHeatmap || participationHeatmap.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No participation data available
      </Typography>
    );
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {heatmapData.map((member) => (
          <Box key={member.userId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                minWidth: 100,
                textAlign: 'right',
                fontSize: '0.75rem',
              }}
            >
              {member.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.3 }}>
              {member.entries.map((entryCount, weekIndex) => (
                <MUITooltip
                  key={weekIndex}
                  title={`${entryCount} entries - ${weekLabels[weekIndex]}`}
                  arrow
                >
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      backgroundColor: getColorIntensity(entryCount),
                      borderRadius: '2px',
                      cursor: 'pointer',
                      border: '1px solid #ddd',
                    }}
                  />
                </MUITooltip>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
      {weekLabels.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.3, mt: 1, ml: 10 }}>
          {weekLabels.map((label, index) => (
            <Typography
              key={index}
              variant="caption"
              sx={{
                width: 20,
                fontSize: '0.65rem',
                textAlign: 'center',
                color: 'text.secondary',
              }}
            >
              {index % 2 === 0 ? label.split(' ')[0] : ''}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ParticipationHeatmap;

