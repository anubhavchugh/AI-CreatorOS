ALTER TABLE `payments` MODIFY COLUMN `currency` varchar(10) DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) DEFAULT 'clerk';--> statement-breakpoint
ALTER TABLE `payments` ADD `razorpayPaymentId` varchar(255);--> statement-breakpoint
ALTER TABLE `payments` ADD `razorpayOrderId` varchar(255);--> statement-breakpoint
ALTER TABLE `payments` ADD `razorpaySubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `razorpayCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `razorpaySubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `payments` DROP COLUMN `stripePaymentId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stripeCustomerId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stripeSubscriptionId`;