import { useT } from '../i18n/t';
import { Illustration, TabBar } from '../components/ui';

/** Phase 3: charts and insight cards arrive after a week of real use (see PLAN.md). */
export function Insights() {
  const t = useT();
  return (
    <>
      <main class="screen">
        <h1 class="sf-title">{t('tab.insights')}</h1>
        <div class="sf-empty">
          <Illustration name="first-launch" width={240} height={180} />
          <p class="sf-entry" style="color:var(--ink)">{t('insights.soon')}</p>
        </div>
      </main>
      <TabBar active="insights" />
    </>
  );
}
