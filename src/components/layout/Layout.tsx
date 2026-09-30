import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { CopyLinkButton } from '../shared/CopyLinkButton';
import { PalettePicker } from '../shared/PalettePicker';

export function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex justify-end gap-2 -mt-3 mb-1">
          <PalettePicker />
          <CopyLinkButton />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
