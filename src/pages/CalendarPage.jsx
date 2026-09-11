import { useState, lazy, Suspense } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowRight, CheckCircle2, Circle, Plus, Repeat, Bell, Paperclip, Clock } from 'lucide-react';
import CalendarHeader from '../components/layout/CalendarHeader';
import WeekStrip from '../components/layout/WeekStrip';
      <CalendarHeader
        mode={mode}
        onModeChange={setMode}
        selectedDate={selectedDate}
    </div>
  );
}
