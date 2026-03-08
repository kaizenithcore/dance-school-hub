-- Add joint enrollment group support

begin;

-- Add joint_enrollment_group_id to enrollments table
alter table enrollments 
add column if not exists joint_enrollment_group_id uuid;

-- Create index for joint enrollment queries
create index if not exists idx_enrollments_joint_group 
on enrollments(joint_enrollment_group_id) 
where joint_enrollment_group_id is not null;

-- Add comment
comment on column enrollments.joint_enrollment_group_id is 
'Groups multiple enrollments together for joint/family enrollments. All enrollments with the same group_id share the same payer and are processed together for billing.';

commit;
