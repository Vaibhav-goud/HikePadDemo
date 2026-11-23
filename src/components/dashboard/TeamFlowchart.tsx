import React, { useMemo, useState } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { FrontendTeamData } from '@/types';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TeamFlowchartProps {
  teams: FrontendTeamData[];
  selectedBranch?: string;
  selectedDrive?: string;
  selectedMonth?: string;
}

const NodeStyled = ({ label, role, variant = 'default' }: {
  label: string;
  role: string;
  variant?: 'default' | 'vp' | 'dbm' | 'tl' | 'bde'
}) => {
  const getColors = () => {
    switch (variant) {
      case 'vp': return 'bg-indigo-600 border-indigo-700 text-white';
      case 'dbm': return 'bg-blue-500 border-blue-600 text-white';
      case 'tl': return 'bg-emerald-500 border-emerald-600 text-white';
      case 'bde': return 'bg-white border-slate-200 text-slate-800';
      default: return 'bg-white border-slate-300 text-slate-800';
    }
  };

  return (
    <div className={`inline-block p-3 rounded-lg border-2 shadow-md min-w-[160px] transition-all ${getColors()}`}>
      <div className="font-bold text-sm mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{label}</div>
      <div className={`text-[10px] uppercase tracking-tighter ${variant === 'bde' || variant === 'default' ? 'text-slate-500' : 'text-indigo-100'}`}>
        {role}
      </div>
    </div>
  );
};

export function TeamFlowchart({ teams, selectedBranch, selectedDrive, selectedMonth }: TeamFlowchartProps) {
  const [zoom, setZoom] = useState(0.7);

  const hierarchy = useMemo(() => {
    const vpMap = new Map<string, Map<string, FrontendTeamData[]>>();

    // Sort teams to ensure consistency
    const sortedTeams = [...teams].sort((a, b) => {
      const vpa = a.vp || '';
      const vpb = b.vp || '';
      if (vpa !== vpb) return vpa.localeCompare(vpb);
      return (a.dbm || '').localeCompare(b.dbm || '');
    });

    sortedTeams.forEach(team => {
      // Filter for active and current team members only
      const activeCurrentRecords = team.records.filter(r => !r.inactive && r.isCurrentTeamMember);

      if (activeCurrentRecords.length > 0) {
        // Use the VP name from the record if available, otherwise fallback to branch-based VP
        let vpName = team.vp;
        if (!vpName) {
          vpName = activeCurrentRecords[0]?.branch?.includes('Mumbai') ? 'VP Mumbai' : 'VP Hyderabad';
        }

        const dbmName = team.dbm;

        if (!vpMap.has(vpName)) {
          vpMap.set(vpName, new Map());
        }
        const dbmMap = vpMap.get(vpName)!;
        if (!dbmMap.has(dbmName)) {
          dbmMap.set(dbmName, []);
        }
        dbmMap.get(dbmName)!.push({ ...team, records: activeCurrentRecords });
      }
    });

    return vpMap;
  }, [teams]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3));
  const handleResetZoom = () => setZoom(0.7);

  if (teams.length === 0) {
    return (
      <div className="flex items-center justify-center p-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
        <p className="text-slate-400 font-medium">No team data available for the current filters.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button size="icon" variant="secondary" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="secondary" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="secondary" onClick={handleResetZoom} title="Reset Zoom">
          <Maximize className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-full h-[800px] overflow-auto p-12">
        <div
          className="min-w-fit flex justify-center origin-top transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        >
          <Tree
            lineWidth={'2px'}
            lineColor={'#cbd5e1'}
            lineHeight={'40px'}
            lineBorderRadius={'10px'}
            label={<NodeStyled label="Hike Education" role="Organization" variant="vp" />}
          >
            {Array.from(hierarchy.entries()).map(([vpName, dbmMap]) => (
              <TreeNode key={vpName} label={<NodeStyled label={vpName} role="Vice President" variant="vp" />}>
                {Array.from(dbmMap.entries()).map(([dbmName, dbmTeams]) => (
                  <TreeNode key={dbmName} label={<NodeStyled label={dbmName} role="Deputy Branch Manager" variant="dbm" />}>
                    {dbmTeams.map((team, idx) => {
                      // Filter BDEs to only active and current ones
                      const bdeList = Array.from(new Set(team.records.map(r => r.bdeName)))
                        .filter(name => {
                          const rec = team.records.find(r => r.bdeName === name);
                          return rec && !rec.inactive && rec.isCurrentTeamMember;
                        });

                      // Case 1: Both TL and ATL
                      if (team.teamLeader && team.teamLeader !== 'Unassigned' && team.atl) {
                        return (
                          <TreeNode
                            key={`${team.teamLeader}-${idx}`}
                            label={<NodeStyled label={team.teamName} role={`TL: ${team.teamLeader}`} variant="tl" />}
                          >
                            <TreeNode
                              label={<NodeStyled label={team.atl} role="Assistant Team Leader" variant="tl" />}
                            >
                              {bdeList.map((bdeName) => (
                                <TreeNode
                                  key={bdeName}
                                  label={<NodeStyled label={bdeName} role="BDE" variant="bde" />}
                                />
                              ))}
                            </TreeNode>
                          </TreeNode>
                        );
                      }

                      // Case 2: Only TL
                      if (team.teamLeader && team.teamLeader !== 'Unassigned') {
                        return (
                          <TreeNode
                            key={`${team.teamLeader}-${idx}`}
                            label={<NodeStyled label={team.teamName} role={`TL: ${team.teamLeader}`} variant="tl" />}
                          >
                            {bdeList.map((bdeName) => (
                              <TreeNode
                                key={bdeName}
                                label={<NodeStyled label={bdeName} role="BDE" variant="bde" />}
                              />
                            ))}
                          </TreeNode>
                        );
                      }

                      // Case 3: Only ATL (reports to DBM)
                      if (team.atl) {
                        return (
                          <TreeNode
                            key={`${team.atl}-${idx}`}
                            label={<NodeStyled label={team.atl} role="Assistant Team Leader" variant="tl" />}
                          >
                            {bdeList.map((bdeName) => (
                              <TreeNode
                                key={bdeName}
                                label={<NodeStyled label={bdeName} role="BDE" variant="bde" />}
                              />
                            ))}
                          </TreeNode>
                        );
                      }

                      // Default - just BDEs if nothing else (shouldn't happen with strict headers)
                      return bdeList.map((bdeName) => (
                        <TreeNode
                          key={bdeName}
                          label={<NodeStyled label={bdeName} role="BDE" variant="bde" />}
                        />
                      ));
                    })}
                  </TreeNode>
                ))}
              </TreeNode>
            ))}
          </Tree>
        </div>
      </div>
    </div>
  );
}
