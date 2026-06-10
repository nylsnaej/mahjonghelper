import { useState } from 'react';
import { TrainingTab } from './components/TrainingTab';
import { CalculatorTab } from './components/CalculatorTab';

type Tab = 'train' | 'calc';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('train');

  return (
    <div id="app">
      <header>
        <h1>🀄 Mah-Jong MCR</h1>
        <nav id="tab-bar">
          <button className={'tab-btn' + (activeTab === 'train' ? ' active' : '')} onClick={() => setActiveTab('train')}>Entraînement</button>
          <button className={'tab-btn' + (activeTab === 'calc'  ? ' active' : '')} onClick={() => setActiveTab('calc')}>Calculateur</button>
        </nav>
      </header>

      {activeTab === 'train' && <TrainingTab />}
      {activeTab === 'calc'  && <CalculatorTab />}
    </div>
  );
}
