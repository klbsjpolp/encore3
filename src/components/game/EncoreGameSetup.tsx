import { Bot, Gamepad2, Play, Users } from 'lucide-react'

import { AppVersion } from '@/components/AppVersion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BoardId } from '@/data/boardConfigurations'
import { BOARD_CONFIGURATIONS, getBoardConfiguration } from '@/data/boardConfigurations'

import { BoardPreview } from './BoardPreview'

const getAiToggleLabel = (isAI: boolean) =>
  isAI
    ? "Joueur contrôlé par l'IA — cliquer pour un joueur humain"
    : 'Joueur humain — cliquer pour un joueur IA'

interface EncoreGameSetupProps {
  playerNames: string[]
  aiPlayers: boolean[]
  selectedBoards: BoardId[]
  setPlayerName: (index: number, value: string) => void
  toggleAIPlayer: (index: number) => void
  setSelectedBoard: (index: number, board: BoardId) => void
  onStart: () => void
}

export const EncoreGameSetup = ({
  playerNames,
  aiPlayers,
  selectedBoards,
  setPlayerName,
  toggleAIPlayer,
  setSelectedBoard,
  onStart,
}: EncoreGameSetupProps) => {
  return (
    <div className="min-h-screen bg-gradient-board flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Gamepad2 className="w-6 h-6" />
            Configuration d'Encore !
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {playerNames.map((name, index) => (
              <div key={index} className="space-y-2">
                <Label htmlFor={`player-${index}`}>
                  Joueur {index + 1} {aiPlayers[index] && <Badge variant="secondary">IA</Badge>}
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id={`player-${index}`}
                    value={name}
                    onChange={(e) => setPlayerName(index, e.target.value)}
                    placeholder={`Nom du joueur ${index + 1}`}
                    className="flex-1"
                  />
                  <Button
                    variant={aiPlayers[index] ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => toggleAIPlayer(index)}
                    aria-label={getAiToggleLabel(aiPlayers[index])}
                    title={getAiToggleLabel(aiPlayers[index])}
                  >
                    {aiPlayers[index] ? <Bot className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  </Button>
                  <Select
                    value={selectedBoards[index]}
                    onValueChange={(value) => setSelectedBoard(index, value as BoardId)}
                  >
                    <SelectTrigger
                      className="h-auto w-35"
                      aria-label={`Planche du joueur ${index + 1}`}
                    >
                      <SelectValue>
                        <BoardPreview
                          size="medium"
                          board={getBoardConfiguration(selectedBoards[index])}
                        />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {BOARD_CONFIGURATIONS.map((preview) => (
                        <SelectItem key={preview.id} value={preview.id}>
                          <BoardPreview size="large" board={preview} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={onStart} className="w-full" variant="game" size="lg">
            <Play className="w-4 h-4 mr-2" />
            Commencer la partie
          </Button>

          <div className="text-center">
            <AppVersion />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
