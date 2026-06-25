/**
 * Compile-time API contract drift gate.
 *
 * `api-contracts.gen.ts` is generated from the API's DTO sources
 * (`menofhunger-api/src/common/dto/**`) via `npm run emit:contracts` in the API
 * repo. This file statically asserts that every value the API can return (the
 * generated DTO shape) is assignable to the hand-maintained mirror type in
 * `types/api.ts` that the app actually consumes.
 *
 * If the API adds a required field, removes a field, or changes a field's type
 * in a way the www mirror doesn't allow, `npx nuxi typecheck` fails here —
 * replacing the old regex-based spot checks with real structural comparison.
 *
 * Direction of the check: `Satisfies<WwwType, ApiDto>` requires ApiDto to be
 * assignable to WwwType. The www mirrors are allowed to be *looser* (extra
 * optional fields, wider unions) but never *stricter* than the API contract.
 */
import type * as Api from './api-contracts.gen'
import type * as Www from './api'

/** Fails to compile unless `TApi` is assignable to `TWww`. */
type Satisfies<TWww, TApi extends TWww> = TApi

/* eslint-disable @typescript-eslint/no-unused-vars */

// ─── Envelope ────────────────────────────────────────────────────────────────
type _Pagination = Satisfies<Www.ApiPagination, { nextCursor: string | null }>

// ─── Cashtags ─────────────────────────────────────────────────────────────────
type _CashtagResult = Satisfies<Www.CashtagResult, Api.CashtagResultDto>

// ─── Posts ───────────────────────────────────────────────────────────────────
type _FeedPost = Satisfies<Www.FeedPost, Api.PostDto>
type _PostAuthor = Satisfies<Www.PostAuthor, Api.PostAuthorDto>
type _PostMedia = Satisfies<Www.PostMedia, Api.PostMediaDto>
type _PostMention = Satisfies<Www.PostMention, Api.PostMentionDto>
type _PostPoll = Satisfies<Www.PostPoll, Api.PostPollDto>
type _PostPollOption = Satisfies<Www.PostPollOption, Api.PostPollOptionDto>

// ─── Users / profiles ────────────────────────────────────────────────────────
type _PublicProfile = Satisfies<Www.PublicProfile, Api.PublicProfileDto>
type _UserDto = Satisfies<Www.UserDto, Api.UserDto>
type _OrgAffiliation = Satisfies<Www.OrgAffiliation, Api.OrgAffiliationDto>
type _UserStatus = Satisfies<Www.UserStatus, Api.UserStatusDto>

// ─── Notifications ───────────────────────────────────────────────────────────
type _Notification = Satisfies<Www.Notification, Api.NotificationDto>
type _NotificationActor = Satisfies<Www.NotificationActor, Api.NotificationActorDto>
type _SubjectPostPreview = Satisfies<Www.SubjectPostPreview, Api.SubjectPostPreviewDto>
type _SubjectArticlePreview = Satisfies<Www.SubjectArticlePreview, Api.SubjectArticlePreviewDto>
type _NotificationPreferences = Satisfies<Www.NotificationPreferences, Api.NotificationPreferencesDto>

// ─── Messages ────────────────────────────────────────────────────────────────
type _Message = Satisfies<Www.Message, Api.MessageDto>
type _MessageMedia = Satisfies<Www.MessageMedia, Api.MessageMediaDto>
type _MessageReplySnippet = Satisfies<Www.MessageReplySnippet, Api.MessageReplySnippetDto>
type _MessageConversation = Satisfies<Www.MessageConversation, Api.MessageConversationDto>

// ─── Billing / referrals ─────────────────────────────────────────────────────
type _BillingMe = Satisfies<Www.BillingMe, Api.BillingMeDto>
type _ActiveGrant = Satisfies<Www.ActiveSubscriptionGrant, Api.ActiveSubscriptionGrantDto>
type _Recruit = Satisfies<Www.Recruit, Api.RecruitDto>
type _ReferralMe = Satisfies<Www.ReferralMe, Api.ReferralMeDto>

// ─── Spaces / radio ──────────────────────────────────────────────────────────
type _Space = Satisfies<Www.Space, Api.SpaceDto>
type _SpaceOwner = Satisfies<Www.SpaceOwner, Api.SpaceOwnerDto>
type _RadioStation = Satisfies<Www.RadioStation, Api.RadioStationDto>
type _WatchPartyState = Satisfies<Www.WatchPartyState, Api.WatchPartyStateDto>

// ─── Groups ──────────────────────────────────────────────────────────────────
type _CommunityGroupPreview = Satisfies<Www.CommunityGroupPreview, Api.CommunityGroupPreviewDto>
type _CommunityGroupInvite = Satisfies<Www.CommunityGroupInvite, Api.CommunityGroupInviteDto>
type _CommunityGroupShell = Satisfies<Www.CommunityGroupShell, Api.CommunityGroupShellDto>

// ─── Websocket payloads ──────────────────────────────────────────────────────
type _WsNotificationsNew = Satisfies<Www.WsNotificationsNewPayload, Api.NotificationsNewPayloadDto>
type _WsNotificationsDeleted = Satisfies<Www.WsNotificationsDeletedPayload, Api.NotificationsDeletedPayloadDto>
type _WsMessagesRead = Satisfies<Www.WsMessagesReadPayload, Api.MessagesReadPayloadDto>
type _WsFollowsChanged = Satisfies<Www.WsFollowsChangedPayload, Api.FollowsChangedPayloadDto>
type _WsPostsInteraction = Satisfies<Www.WsPostsInteractionPayload, Api.PostsInteractionPayloadDto>
type _WsPostsLiveUpdated = Satisfies<Www.WsPostsLiveUpdatedPayload, Api.PostsLiveUpdatedPayloadDto>
type _WsPostsCommentAdded = Satisfies<Www.WsPostsCommentAddedPayload, Api.PostsCommentAddedPayloadDto>
type _WsPostsCommentDeleted = Satisfies<Www.WsPostsCommentDeletedPayload, Api.PostsCommentDeletedPayloadDto>
type _WsFeedNewPost = Satisfies<Www.WsFeedNewPostPayload, Api.FeedNewPostPayloadDto>
type _WsGroupNewPost = Satisfies<Www.WsGroupNewPostPayload, Api.GroupNewPostPayloadDto>
type _WsGroupMarvChanged = Satisfies<Www.WsGroupMarvChangedPayload, Api.GroupMarvChangedPayloadDto>
type _WsUsersMeUpdated = Satisfies<Www.WsUsersMeUpdatedPayload, Api.UsersMeUpdatedPayloadDto>
type _WsUsersSelfUpdated = Satisfies<Www.WsUsersSelfUpdatedPayload, Api.UsersSelfUpdatedPayloadDto>
type _WsAdminUpdated = Satisfies<Www.WsAdminUpdatedPayload, Api.AdminUpdatedPayloadDto>
type _WsCheckinAnsweredToday = Satisfies<Www.WsCheckinAnsweredTodayPayload, Api.CheckinAnsweredTodayPayloadDto>

// ─── Enums (sets must match exactly; www aliases these directly) ─────────────
type _PostVisibility = Satisfies<Www.PostVisibility, Api.PostVisibility>
type _PostMediaKind = Satisfies<Www.PostMediaKind, Api.PostMediaKind>
type _PostMediaSource = Satisfies<Www.PostMediaSource, Api.PostMediaSource>
type _NotificationKind = Satisfies<Www.NotificationKind, Api.NotificationKind>
type _FollowVisibility = Satisfies<Www.FollowVisibility, Api.FollowVisibility>
type _BirthdayVisibility = Satisfies<Www.BirthdayVisibility, Api.BirthdayVisibility>
type _VerificationRequestStatus = Satisfies<Www.VerificationRequestStatus, Api.VerificationRequestStatus>
type _ReportReason = Satisfies<Www.ReportReason, Api.ReportReason>
type _ReportStatus = Satisfies<Www.ReportStatus, Api.ReportStatus>
type _FeedbackCategory = Satisfies<Www.FeedbackCategory, Api.FeedbackCategory>
type _FeedbackStatus = Satisfies<Www.FeedbackStatus, Api.FeedbackStatus>
type _BillingTier = Satisfies<Www.BillingTier, Api.BillingTier>

export {}
