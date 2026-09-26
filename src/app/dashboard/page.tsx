'use client';

import React from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { KPIOverview } from '../../components/dashboard/KPIOverview';
import { PlanningPipeline } from '../../components/dashboard/PlanningPipeline';
import { OperationalSummary } from '../../components/dashboard/OperationalSummary';
import { Alerts } from '../../components/dashboard/Alerts';

export default function DashboardPage() {
  return (
    <PageContainer>
      {/* KPI Cards */}
      <section aria-label="Operational KPIs">
        <KPIOverview />
      </section>

      {/* End-to-End Planning Status Pipeline */}
      <section aria-label="Planning Pipeline Status">
        <PlanningPipeline />
      </section>

      {/* Control Office Operational Alerts */}
      <section aria-label="Priority Alerts">
        <Alerts />
      </section>

      {/* Active Blocks & Corridor Availability Summary */}
      <section aria-label="Operational Summary">
        <OperationalSummary />
      </section>
    </PageContainer>
  );
}
