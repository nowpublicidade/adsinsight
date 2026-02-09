import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PlatformHeader from '@/components/layout/PlatformHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const tabs = [
  { value: 'overview', label: 'Visão Geral' },
  { value: 'ads', label: 'Anúncios' },
  { value: 'history', label: 'Histórico' },
];

export default function GoogleAds() {
  const [activeTab, setActiveTab] = useState('overview');
  const [datePreset, setDatePreset] = useState('last_7d');

  return (
    <DashboardLayout>
      <PlatformHeader
        platform="google"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
      />

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {['Custo', 'Conversões', 'Taxa Conv.', 'CPC Médio', 'CTR'].map((label) => (
              <Card key={label} className="card-glow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">—</div>
                  <p className="text-xs text-muted-foreground mt-1">Conecte o Google Ads</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Visão Geral de Campanhas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Dados serão exibidos após conexão com Google Ads.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'ads' && (
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="text-lg">Campanhas e Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Métricas por campanha, grupo de anúncios e keywords.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="text-lg">Histórico Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Dados históricos mês a mês.</p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
