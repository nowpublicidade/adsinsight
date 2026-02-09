import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PlatformHeader from '@/components/layout/PlatformHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const tabs = [
  { value: 'overview', label: 'Visão Geral' },
  { value: 'sources', label: 'Origens de Acesso' },
  { value: 'history', label: 'Histórico' },
  { value: 'tech', label: 'Visão Técnica' },
];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [datePreset, setDatePreset] = useState('last_7d');

  return (
    <DashboardLayout>
      <PlatformHeader
        platform="analytics"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
      />

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {['Sessões', 'Novos Usuários', 'Taxa Engajamento', 'Eventos', 'Duração Média'].map((label) => (
              <Card key={label} className="card-glow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">—</div>
                  <p className="text-xs text-muted-foreground mt-1">Conecte o Analytics</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Visão Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Dados serão exibidos após integração com Google Analytics.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'sources' && (
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="text-lg">Origens de Acesso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Tabela por origem/mídia.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="text-lg">Histórico Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Dados históricos por mês.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'tech' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {['Dispositivos', 'Navegadores'].map((label) => (
            <Card key={label} className="card-glow">
              <CardHeader>
                <CardTitle className="text-lg">{label}</CardTitle>
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
