import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { SCORE_DIMENSIONS, SCORE_DIMENSION_LABELS } from '@everprompt/shared';
import type { PromptAiReview } from '@everprompt/shared';

interface ScoreRadarProps {
  review: PromptAiReview;
}

export function ScoreRadar({ review }: ScoreRadarProps) {
  const data = SCORE_DIMENSIONS.map((dim) => {
    const key = `${dim}_score` as keyof PromptAiReview;
    return {
      dimension: SCORE_DIMENSION_LABELS[dim],
      score: review[key] as number,
      fullMark: 100,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid
          stroke="#27272a"
          strokeDasharray="3 3"
        />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: '#71717a', fontSize: 10 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: '#52525b', fontSize: 9 }}
          axisLine={false}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
