const goalEl = document.getElementById('goal');
const triggerEl = document.getElementById('trigger');
const actionEl = document.getElementById('action');
const guardrailEl = document.getElementById('guardrail');
const planEl = document.getElementById('plan');
const simEl = document.getElementById('simulation');
const button = document.getElementById('generate');

function buildPlan(goal, trigger, action, guardrail) {
  const safeGoal = goal?.trim() || 'Automate repetitive operations';
  return {
    objective: safeGoal,
    steps: [
      `1) Ingest event from trigger: ${trigger}`,
      '2) Normalize payload and enrich context from internal knowledge base',
      `3) Execute primary action: ${action}`,
      `4) Apply guardrail: ${guardrail}`,
      '5) Persist decision log with trace ID and confidence score',
      '6) Notify human operator on exception paths',
    ],
    metrics: {
      target_time_saved_pct: 35,
      target_error_reduction_pct: 25,
      intervention_rate_target_pct: 10,
    },
  };
}

button.addEventListener('click', () => {
  const plan = buildPlan(goalEl.value, triggerEl.value, actionEl.value, guardrailEl.value);
  planEl.textContent = JSON.stringify(plan, null, 2);

  const sim = [
    `Event captured via ${triggerEl.value}`,
    'Payload validated (schema=v1)',
    `${actionEl.value} executed (confidence=0.91)`,
    `Guardrail passed: ${guardrailEl.value}`,
    'Audit log written (trace_id=sim_001)',
  ];

  simEl.innerHTML = '';
  sim.forEach((line) => {
    const li = document.createElement('li');
    li.textContent = line;
    simEl.appendChild(li);
  });
});
