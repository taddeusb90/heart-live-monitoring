import { Routes } from '@angular/router';
import { MainViewComponent } from './pages/main-view/main-view.component';
import { HistoricalViewComponent } from './pages/historical-view/historical-view.component';
import { LiveSessionComponent } from './pages/live-session/live-session.component';
import { SessionHistoryListComponent } from './pages/session-history-list/session-history-list.component';


export const routes: Routes = [
    {
        path: '',
        component: MainViewComponent
    },
    {
        path: 'live-session',
        component: LiveSessionComponent
    },
    {
        path: 'session-history',
        component: SessionHistoryListComponent
    },
    {
        path: 'session-history/:id',
        component: HistoricalViewComponent
    },
    {
        path: '**',
        redirectTo: ''
    }
];
