/**
 * Site content. Edit here, not in index.html — main.js renders these lists.
 * Values carried over from the Claude Design source.
 */
window.SITE = {
  /* Skill bars. Level is out of 5. */
  tools: [
    { name: 'Go', level: 5 },
    { name: 'Python', level: 5 },
    { name: 'TypeScript / JavaScript', level: 4 },
    { name: 'C / C++', level: 4 },
    { name: 'Verilog / TL-Verilog', level: 4 },
    { name: 'Solidity', level: 3 },
    { name: 'Docker · CI/CD · Linux', level: 4 },
    { name: 'Sigstore · cosign · in-toto', level: 4 },
    { name: 'After Effects', level: 3 },
    { name: 'DaVinci Resolve', level: 3 },
  ],

  timeline: [
    {
      when: 'JUN – AUG 2026',
      role: 'Engineering Intern',
      org: 'Redwood EDA',
      note: 'Agentic Verilog → TL-Verilog pipeline with formal equivalence (EQY/SymbiYosys); 5+ upstream PRs merged.',
    },
    {
      when: '[START DATE] – NOW',
      role: 'Maintainer',
      org: 'Minder, OpenSSF',
      note: 'Joined via LFX mentorship — rule testing and CI tooling for supply-chain security.',
    },
    {
      when: 'OPEN SOURCE',
      role: 'Upstream contributor',
      org: 'ProjectDiscovery · CERT-Polska · BOMHort',
      note: 'Seven merged CVE templates, Artemis scanner work, SBOM upload endpoint.',
    },
    {
      when: 'MAY – JUL 2025',
      role: 'Research Intern',
      org: 'IIT Jodhpur',
      note: 'Quantum computing and teleportation protocols with IBM Qiskit.',
    },
    {
      when: 'AUG 2024 – JUL 2028',
      role: 'B.Tech, ECE',
      org: 'LNMIIT Jaipur',
      note: 'Electronics and Communication Engineering.',
    },
  ],

  /* Contact form subject chips. The first is selected on load. */
  topics: ['Bug report', 'Collaboration', 'Talk / event', 'Something else'],
};
