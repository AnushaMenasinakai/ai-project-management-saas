import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import ProjectQASection from '../components/project-details/ProjectQASection';

const renderSection = (sources) => render(<ProjectQASection
  question="What is the release plan?"
  answer="The release is phased. [S1]"
  answerQuestion="What is the release plan?"
  sources={sources}
  loading={false}
  error=""
  onQuestionChange={vi.fn()}
  onSubmit={vi.fn()}
/>);

describe('ground source display', () => {
  test('renders grounded file metadata, location, excerpt, and relevance', () => {
    renderSection([{
      sourceId: 'S1', chunkId: 'chunk-1', title: 'Release Plan',
      originalFilename: 'release-plan.pdf', pageNumber: 3, section: 'Milestones',
      score: 0.876, excerpt: 'The release begins with a controlled pilot.',
    }]);
    expect(screen.getByText('S1')).toBeInTheDocument();
    expect(screen.getByText('Release Plan')).toBeInTheDocument();
    expect(screen.getByText('release-plan.pdf · Page 3 · Milestones')).toBeInTheDocument();
    expect(screen.getByText('The release begins with a controlled pilot.')).toBeInTheDocument();
    expect(screen.getByText('Relevance 87.6%')).toBeInTheDocument();
  });

  test('keeps legacy sources without new metadata readable', () => {
    renderSection([{ chunkId: 'legacy', title: 'Notes', content: 'Legacy excerpt.' }]);
    expect(screen.getByText('Source 1')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Legacy excerpt.')).toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });
});
