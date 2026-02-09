import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PlatformHeader from '@/components/layout/PlatformHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const tabs = [
  { value: 'overview', label: 'Visão Geral' },
  { value: 'ads', label: 'Anúncios' },
  { value: 'demographics', label: 'Demográfico' },
];

export default function MetaAds() {
  const [activeTab, setActiveTab] = useState('overview');
  const [datePreset, setDatePreset] = useState('last_7d');

  return (
    <DashboardLayout>
      <PlatformHeader
        platform="meta"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
      />

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {['Investimento', 'Total de Leads', 'Custo por Lead', 'Impressões', 'CPC', 'CPM'].map((label) => (
              <Card key={label} className="card-glow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">—</div>
                  <p className="text-xs text-muted-foreground mt-1">Conecte o Meta Ads</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Performance por Campanha</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Dados serão exibidos após conexão com Meta Ads.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'ads' && (
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="text-lg">Performance por Criativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Prévia dos anúncios e métricas por criativo.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'demographics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {['Canal', 'Posicionamento', 'Idade', 'Gênero'].map((label) => (
            <Card key={label} className="card-glow">
              <CardHeader>
                <CardTitle className="text-lg">Performance por {label}</CardTitle>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Gráfico de {label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
