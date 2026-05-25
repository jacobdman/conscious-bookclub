import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  LinearProgress,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { Add, ChevronRight, Edit, DeleteOutline } from '@mui/icons-material';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { useClubGoalsContext } from 'contexts/ClubGoals';
import { getClubGoalOverviewReport } from 'services/reports/reports.service';
import { useQuery } from '@tanstack/react-query';
import ClubGoalFormModal from 'components/ClubGoalFormModal';
import GoalDetailsModal from 'components/Goals/GoalDetailsModal';
import IOSConfirmDialog from 'components/IOSConfirmDialog';
import useGoalsContext from 'contexts/Goals';
import { getGoalTypeLabel, getGoalTypeColor } from 'utils/goalHelpers';
import { getClubGoalTableProgressCopy } from 'utils/clubGoalReportDisplay';
import Chip from '@mui/material/Chip';

const ClubGoalsList = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const { clubGoals, deleteClubGoal } = useClubGoalsContext();
  const { goals, refreshGoals } = useGoalsContext();
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingClubGoal, setEditingClubGoal] = useState(null);
  const [selectedClubGoalId, setSelectedClubGoalId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const memberGoalForDetail = useMemo(() => {
    if (!selectedClubGoalId) return null;
    return (
      goals.find(
        (g) => Number(g.clubGoalId) === Number(selectedClubGoalId) && !g.archived,
      ) || null
    );
  }, [goals, selectedClubGoalId]);

  const canManage = currentClub && ['owner', 'admin'].includes(currentClub.role);

  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ['clubGoalOverview', user?.uid, currentClub?.id],
    queryFn: () => getClubGoalOverviewReport(currentClub.id, user.uid),
    enabled: !!user?.uid && !!currentClub?.id,
  });

  const rows = overview?.clubGoals || [];

  const resolveClubGoalForEdit = (row) => {
    if (!row?.id) return row;
    return clubGoals.find((cg) => Number(cg.id) === Number(row.id)) || row;
  };

  const handleRowClick = (id) => {
    const memberGoal = goals.find(
      (g) => Number(g.clubGoalId) === Number(id) && !g.archived,
    );
    if (!memberGoal) return;
    setSelectedClubGoalId(id);
    setDetailOpen(true);
  };

  const handleCreate = () => {
    setEditingClubGoal(null);
    setFormOpen(true);
  };

  const handleEdit = (event, row) => {
    event.stopPropagation();
    setEditingClubGoal(resolveClubGoalForEdit(row));
    setFormOpen(true);
  };

  const handleDeleteClick = (event, row) => {
    event.stopPropagation();
    setDeleteTarget(row);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleteLoading(true);
    setActionError(null);
    try {
      await deleteClubGoal(deleteTarget.id);
      if (Number(selectedClubGoalId) === Number(deleteTarget.id)) {
        setDetailOpen(false);
        setSelectedClubGoalId(null);
      }
      setDeleteTarget(null);
      // Member goals for this club goal are archived server-side; pull the
      // refreshed personal goals list so they disappear from the user's view.
      await refreshGoals?.();
    } catch (err) {
      setActionError(err.message || 'Failed to delete club goal');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFormSaved = async () => {
    setFormOpen(false);
    setEditingClubGoal(null);
    // Refresh the personal goals list so newly auto-created member goals
    // for this club goal appear immediately.
    await refreshGoals?.();
  };

  const snapshotPercent = (snap) => {
    if (!snap || typeof snap.percent !== 'number') return 0;
    return Math.min(100, Math.max(0, snap.percent));
  };

  const colCount = canManage ? 6 : 5;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Club goals</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
            Create club goal
          </Button>
        )}
      </Box>

      {overviewError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {overviewError.message || 'Failed to load'}
        </Alert>
      )}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {overviewLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={40} />
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Members</TableCell>
                {canManage && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} align="center">
                    <Typography color="text.secondary">No club goals yet.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((cg) => {
                  const pct = snapshotPercent(cg.snapshot);
                  const progressLabel = getClubGoalTableProgressCopy(cg.snapshot, cg);
                  return (
                    <TableRow
                      key={cg.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleRowClick(cg.id)}
                    >
                      <TableCell>
                        <ChevronRight sx={{ color: 'text.secondary' }} />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">{cg.title}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getGoalTypeLabel({ type: cg.type })}
                          color={getGoalTypeColor(cg.type)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        <Typography variant="body2">{progressLabel}</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
                        />
                      </TableCell>
                      <TableCell>{cg.memberGoalCount ?? 0}</TableCell>
                      {canManage && (
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <IconButton
                            aria-label={`Edit ${cg.title}`}
                            size="small"
                            color="primary"
                            onClick={(e) => handleEdit(e, cg)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            aria-label={`Delete ${cg.title}`}
                            size="small"
                            color="error"
                            onClick={(e) => handleDeleteClick(e, cg)}
                          >
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ClubGoalFormModal
        open={formOpen}
        clubGoal={editingClubGoal}
        onClose={() => {
          setFormOpen(false);
          setEditingClubGoal(null);
        }}
        onSaved={handleFormSaved}
      />

      <GoalDetailsModal
        open={detailOpen && Boolean(memberGoalForDetail)}
        goal={memberGoalForDetail}
        onClose={() => {
          setDetailOpen(false);
          setSelectedClubGoalId(null);
        }}
      />

      <IOSConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
        title="Delete club goal?"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.title}" for the whole club? All members' linked goals will be removed. This cannot be undone.`
            : ''
        }
        cancelLabel="Cancel"
        confirmLabel="Delete"
        confirmDisabled={deleteLoading}
        destructive
        onConfirm={handleConfirmDelete}
      />
    </Box>
  );
};

export default ClubGoalsList;
