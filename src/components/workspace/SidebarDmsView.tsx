
import { DirectMessagesList } from './DirectMessagesList';

interface SidebarDmsViewProps {
  workspaceId: string;
  selectedDmId: string | null;
  onDmSelect: (dmId: string) => void;
}

export function SidebarDmsView({ workspaceId, selectedDmId, onDmSelect }: SidebarDmsViewProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 border-b border-[#3f0e40]">
        <h2 className="text-lg font-semibold text-white mb-3">Direct messages</h2>
      </div>
      <DirectMessagesList 
        workspaceId={workspaceId}
        selectedDmId={selectedDmId}
        onDmSelect={onDmSelect}
      />
    </div>
  );
}
