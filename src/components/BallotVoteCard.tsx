"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { BallotType, Choice as ChoiceType, User } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Vote as VoteIconLucide,
  BarChartHorizontalBig,
  CalendarClock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BallotAnalyticsDialog } from "./BallotAnalyticsDialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth

interface BallotVoteCardProps {
  ballot: BallotType;
  // currentUser and token will be fetched from useAuth directly
  onVote: (
    ballotId: string,
    choiceIdOrIds: string | string[],
    currentRoomId: string
  ) => Promise<void>;
  now?: Date; // Add now prop for live time
}

export function BallotVoteCard({ ballot, onVote, now }: BallotVoteCardProps) {
  const { currentUser, token } = useAuth(); // Get currentUser and token from AuthContext
  const { toast } = useToast();
  const [selectedRadioChoiceId, setSelectedRadioChoiceId] = useState<
    string | null
  >(null);
  const [selectedCheckboxChoiceIds, setSelectedCheckboxChoiceIds] = useState<
    string[]
  >([]);

  const [showVoteConfirmDialog, setShowVoteConfirmDialog] = useState(false);
  const [choicesToSubmit, setChoicesToSubmit] = useState<
    string | string[] | null
  >(null);
  const [isAnalyticsDialogOpen, setIsAnalyticsDialogOpen] = useState(false);
  const [votingStatusMessage, setVotingStatusMessage] = useState<string | null>(
    null
  );
  const [canVote, setCanVote] = useState(false);
  const [limitReachedToastMessage, setLimitReachedToastMessage] = useState<
    string | null
  >(null);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  const maxChoices = ballot.maxChoicesPerVoter || 1;
  const isMultiChoice = maxChoices > 1;

  const getVotedUserIdsMap = (
    ballotData: BallotType
  ): Map<string, string | string[]> | undefined => {
    if (
      ballotData.votedUserIds &&
      typeof ballotData.votedUserIds === "object" &&
      !(ballotData.votedUserIds instanceof Map)
    ) {
      return new Map(Object.entries(ballotData.votedUserIds));
    }
    return ballotData.votedUserIds as
      | Map<string, string | string[]>
      | undefined;
  };

  const votedMap = getVotedUserIdsMap(ballot);
  const userVotedChoiceOrIds =
    currentUser && votedMap ? votedMap.get(currentUser.id) : null;
  const userHasVoted = !!userVotedChoiceOrIds;

  useEffect(() => {
    if (limitReachedToastMessage) {
      toast({
        variant: "destructive",
        title: "Limit Reached",
        description: limitReachedToastMessage,
      });
      setLimitReachedToastMessage(null);
    }
  }, [limitReachedToastMessage, toast]);

  useEffect(() => {
    const currentTime = now || new Date();
    let statusMsg = "";
    let voteAllowed = true;

    if (ballot.startTime && new Date(ballot.startTime) > currentTime) {
      statusMsg = `Voting opens: ${format(new Date(ballot.startTime), "PPp")}`;
      voteAllowed = false;
    } else if (ballot.endTime && new Date(ballot.endTime) < currentTime) {
      statusMsg = `Voting closed: ${format(new Date(ballot.endTime), "PPp")}`;
      voteAllowed = false;
    } else {
      statusMsg = "Voting is currently open.";
      if (ballot.startTime && ballot.endTime) {
        statusMsg = `Open from ${format(
          new Date(ballot.startTime),
          "PPp"
        )} until: ${format(new Date(ballot.endTime), "PPp")}`;
      } else if (ballot.endTime) {
        statusMsg = `Open until: ${format(new Date(ballot.endTime), "PPp")}`;
      } else if (ballot.startTime) {
        statusMsg = `Opened: ${format(new Date(ballot.startTime), "PPp")}`;
      }
    }
    setVotingStatusMessage(statusMsg);
    setCanVote(voteAllowed);

    if (userHasVoted) {
      if (isMultiChoice && Array.isArray(userVotedChoiceOrIds)) {
        setSelectedCheckboxChoiceIds(userVotedChoiceOrIds);
      } else if (!isMultiChoice && typeof userVotedChoiceOrIds === "string") {
        setSelectedRadioChoiceId(userVotedChoiceOrIds);
      }
    } else {
      setSelectedRadioChoiceId(null);
      setSelectedCheckboxChoiceIds([]);
    }
  }, [
    ballot.startTime,
    ballot.endTime,
    ballot.id,
    userVotedChoiceOrIds,
    userHasVoted,
    isMultiChoice,
    now, // depend on now
  ]);

  const handleRadioChange = (choiceId: string) => {
    setSelectedRadioChoiceId(choiceId);
  };

  const handleCheckboxChange = (choiceId: string, checked: boolean) => {
    setSelectedCheckboxChoiceIds((prev) => {
      if (checked) {
        if (prev.length < maxChoices) {
          return [...prev, choiceId];
        } else {
          setLimitReachedToastMessage(
            `You can select up to ${maxChoices} choice${
              maxChoices !== 1 ? "s" : ""
            }.`
          );
          return prev;
        }
      } else {
        return prev.filter((id) => id !== choiceId);
      }
    });
  };

  const initiateVoteSubmission = () => {
    const submissionValue = isMultiChoice
      ? selectedCheckboxChoiceIds
      : selectedRadioChoiceId;

    if (isMultiChoice && selectedCheckboxChoiceIds.length === 0) {
      toast({
        variant: "destructive",
        title: "No Selection",
        description: "Please select at least one choice to vote.",
      });
      return;
    }
    if (!isMultiChoice && !selectedRadioChoiceId) {
      toast({
        variant: "destructive",
        title: "No Selection",
        description: "Please select a choice to vote.",
      });
      return;
    }
    if (!currentUser || !token) {
      // Check currentUser and token from useAuth()
      toast({
        variant: "destructive",
        title: "Not Logged In",
        description: "Please log in to vote.",
      });
      return;
    }
    if (!canVote) {
      toast({
        variant: "destructive",
        title: "Voting Not Active",
        description:
          votingStatusMessage ||
          "This ballot is not currently open for voting.",
      });
      return;
    }

    setChoicesToSubmit(submissionValue);
    setShowVoteConfirmDialog(true);
  };

  const confirmVote = async () => {
    if (!choicesToSubmit || !currentUser || !token) {
      // Re-check for safety, though initiateVoteSubmission should catch it
      setShowVoteConfirmDialog(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Authentication missing or no choice selected.",
      });
      return;
    }
    setIsSubmittingVote(true);
    try {
      await onVote(ballot.id, choicesToSubmit, ballot.roomId as string);
    } catch (error) {
      // Error toast is handled by parent (RoomPage)
    } finally {
      setIsSubmittingVote(false);
      setShowVoteConfirmDialog(false);
      // setChoicesToSubmit(null); // Keep for confirmation message, reset if dialog closes
    }
  };

  const totalVotes = ballot.choices.reduce(
    (sum, choice) => sum + choice.voteCount,
    0
  );

  const getConfirmationMessage = () => {
    if (!choicesToSubmit)
      return "Are you sure you want to cast your vote? This action may not be reversible.";

    if (isMultiChoice && Array.isArray(choicesToSubmit)) {
      const choiceTexts = choicesToSubmit
        .map((id) => ballot.choices.find((c) => c.id === id)?.text)
        .filter(Boolean);
      if (choiceTexts.length === 0)
        return "Are you sure? This action may not be reversible.";
      return `Are you sure you want to cast your vote for: "${choiceTexts.join(
        '", "'
      )}"? This action may not be reversible.`;
    } else if (typeof choicesToSubmit === "string") {
      const choiceText = ballot.choices.find(
        (c) => c.id === choicesToSubmit
      )?.text;
      return `Are you sure you want to cast your vote for "${
        choiceText || "the selected option"
      }"? This action may not be reversible.`;
    }
    return "Are you sure you want to cast your vote? This action may not be reversible.";
  };

  return (
    <>
      <Card className="shadow-md mb-4 bg-card/95">
        <CardHeader className="pb-3 pt-4 px-4 border-b">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold line-clamp-2 flex-grow">
              {ballot.title}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAnalyticsDialogOpen(true)}
              aria-label="View Ballot Analytics"
              className="h-8 w-8 flex-shrink-0"
            >
              <BarChartHorizontalBig className="h-4 w-4 text-primary" />
            </Button>
          </div>
          {votingStatusMessage && (
            <CardDescription className="text-xs pt-1 flex items-center">
              <CalendarClock className="h-3 w-3 mr-1.5 text-muted-foreground" />
              {votingStatusMessage}
            </CardDescription>
          )}
          {isMultiChoice && (
            <CardDescription className="text-xs pt-1">
              Select up to {maxChoices} choice{maxChoices > 1 ? "s" : ""}.
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pt-3 pb-4 px-4">
          {isMultiChoice ? (
            <div className="space-y-2">
              {ballot.choices.map((choice) => {
                const percentage =
                  totalVotes > 0
                    ? Math.round((choice.voteCount / totalVotes) * 100)
                    : 0;
                const isCheckedByCurrentUser =
                  userHasVoted &&
                  Array.isArray(userVotedChoiceOrIds) &&
                  userVotedChoiceOrIds.includes(choice.id);
                const isCurrentlySelected = selectedCheckboxChoiceIds.includes(
                  choice.id
                );

                return (
                  <div
                    key={`${ballot.id}-choice-${choice.id}`}
                    className={cn(
                      "p-2.5 border rounded-md transition-colors mb-2",
                      isCheckedByCurrentUser
                        ? "bg-primary/10 border-primary"
                        : "bg-background hover:bg-muted/60",
                      (!canVote || userHasVoted) &&
                        "cursor-not-allowed opacity-70"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`${ballot.id}-${choice.id}-vote`}
                        checked={
                          userHasVoted
                            ? isCheckedByCurrentUser
                            : isCurrentlySelected
                        }
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(choice.id, !!checked)
                        }
                        disabled={
                          !currentUser ||
                          userHasVoted ||
                          !canVote ||
                          isSubmittingVote
                        }
                        aria-label={choice.text}
                      />
                      <Label
                        htmlFor={`${ballot.id}-${choice.id}-vote`}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        {choice.text}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        ({choice.voteCount})
                      </span>
                    </div>
                    {(userHasVoted || !canVote) && totalVotes > 0 && (
                      <div className="mt-1.5 pl-7">
                        <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                          <span>{percentage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <RadioGroup
              value={
                userHasVoted && typeof userVotedChoiceOrIds === "string"
                  ? userVotedChoiceOrIds
                  : selectedRadioChoiceId || undefined
              }
              onValueChange={handleRadioChange}
              disabled={
                !currentUser || userHasVoted || !canVote || isSubmittingVote
              }
            >
              {ballot.choices.map((choice) => {
                const percentage =
                  totalVotes > 0
                    ? Math.round((choice.voteCount / totalVotes) * 100)
                    : 0;
                const isThisChoiceVotedByUser =
                  userHasVoted && userVotedChoiceOrIds === choice.id;

                return (
                  <div
                    key={`${ballot.id}-choice-${choice.id}`}
                    className={cn(
                      "p-2.5 border rounded-md hover:bg-muted/60 transition-colors mb-2",
                      isThisChoiceVotedByUser
                        ? "bg-primary/10 border-primary"
                        : "bg-background",
                      (!canVote || userHasVoted) &&
                        "cursor-not-allowed opacity-70"
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={choice.id}
                        id={`${ballot.id}-${choice.id}-vote`}
                        disabled={
                          !currentUser ||
                          userHasVoted ||
                          !canVote ||
                          isSubmittingVote
                        }
                      />
                      <Label
                        htmlFor={`${ballot.id}-${choice.id}-vote`}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        {choice.text}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        ({choice.voteCount})
                      </span>
                    </div>
                    {(userHasVoted || !canVote) && totalVotes > 0 && (
                      <div className="mt-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                          <span>{percentage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </RadioGroup>
          )}

          {!currentUser && (
            <p className="text-xs text-destructive mt-2">Log in to vote.</p>
          )}
          {currentUser && !userHasVoted && canVote && (
            <Button
              onClick={initiateVoteSubmission}
              disabled={
                isSubmittingVote ||
                (isMultiChoice
                  ? selectedCheckboxChoiceIds.length === 0
                  : !selectedRadioChoiceId)
              }
              className="mt-3 w-full"
              size="sm"
            >
              {isSubmittingVote ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <VoteIconLucide className="mr-2 h-4 w-4" />
              )}
              {isSubmittingVote ? "Submitting..." : "Submit Vote"}
            </Button>
          )}
          {currentUser && userHasVoted && (
            <p className="text-xs text-center text-green-600 mt-3 py-1.5 px-2 border border-green-600 bg-green-50 rounded-md">
              You have voted on this ballot.
            </p>
          )}
          {currentUser && !canVote && !userHasVoted && votingStatusMessage && (
            <div className="text-xs text-center text-orange-600 mt-3 py-1.5 px-2 border border-orange-600 bg-orange-50 rounded-md flex items-center justify-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {votingStatusMessage.includes("opens")
                ? "Voting has not started yet."
                : "Voting for this ballot is closed."}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={showVoteConfirmDialog}
        onOpenChange={(open) => {
          setShowVoteConfirmDialog(open);
          if (!open) setChoicesToSubmit(null); // Clear choices if dialog is closed without confirmation
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Vote</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setChoicesToSubmit(null);
                setShowVoteConfirmDialog(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmVote}
              disabled={isSubmittingVote}
            >
              {isSubmittingVote ? "Confirming..." : "Confirm Vote"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BallotAnalyticsDialog
        open={isAnalyticsDialogOpen}
        onOpenChange={setIsAnalyticsDialogOpen}
        ballotTitle={ballot.title}
        roomId={ballot.roomId as string}
        ballotId={ballot.id}
      />
    </>
  );
}
