'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateChild } from '@/data/hooks';
import { ParentPage } from './ParentPage';
import { Avatar } from '@/game/avatar';
import { Button } from '@/ui/button';
import { FormField } from '@/ui/form-field';
import { Input } from '@/ui/input';
import { PinInput } from '@/ui/pin-input';
import { Select } from '@/ui/select';
import { Switch } from '@/ui/switch';

const AVATARS = ['fox', 'owl', 'bear', 'cat', 'panda', 'rabbit', 'lion', 'turtle'];

/** Form to add a child profile (name, grade, avatar, PIN). */
export function ChildForm() {
  const t = useTranslations('screens.parent.childForm');
  const router = useRouter();
  const create = useCreateChild();
  const [usePin, setUsePin] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        display_name: z.string().trim().min(1, t('errors.name')).max(30, t('errors.nameLong')),
        grade: z.string().min(1, t('errors.grade')),
        avatar_id: z.string().min(1, t('errors.avatar')),
        pin: z.string(),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { display_name: '', grade: '', avatar_id: 'fox', pin: '' } });

  async function onSubmit(v: Values) {
    if (usePin && v.pin.length !== 4) {
      setError('pin', { message: t('errors.pin') });
      return;
    }
    const child = await create.mutateAsync({
      display_name: v.display_name.trim(),
      grade: Number(v.grade),
      avatar_id: v.avatar_id,
      pin: usePin ? v.pin : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    router.replace(`/parent/children/${child.id}/consent`);
  }

  return (
    <ParentPage title={t('title')} backHref="/parent">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto flex w-full max-w-md flex-col gap-5">
        <FormField label={t('name')} htmlFor="display_name" hint={t('nameHint')} error={errors.display_name?.message} required>
          <Input
            id="display_name"
            autoComplete="off"
            maxLength={30}
            invalid={Boolean(errors.display_name)}
            aria-describedby={['display_name-hint', errors.display_name ? 'display_name-error' : ''].filter(Boolean).join(' ')}
            {...register('display_name')}
          />
        </FormField>

        <Controller
          control={control}
          name="grade"
          render={({ field }) => (
            <div>
              <Select
                label={t('grade')}
                placeholder={t('gradePlaceholder')}
                value={field.value}
                onValueChange={field.onChange}
                options={[1, 2, 3, 4].map((g) => ({ value: String(g), label: t('gradeOption', { grade: g }) }))}
              />
              {errors.grade && <p role="alert" className="mt-1 text-sm text-danger">{errors.grade.message}</p>}
            </div>
          )}
        />

        <Controller
          control={control}
          name="avatar_id"
          render={({ field }) => (
            <fieldset className="flex flex-col gap-2">
              <legend className="font-display font-semibold">{t('avatar')}</legend>
              <div role="radiogroup" aria-label={t('avatar')} className="grid grid-cols-4 gap-3">
                {AVATARS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={field.value === id}
                    aria-label={id}
                    onClick={() => field.onChange(id)}
                    className={`lift flex items-center justify-center rounded-lg border-4 p-1 ${field.value === id ? 'border-brand' : 'border-transparent'}`}
                  >
                    <Avatar avatarId={id} name={id} size="lg" />
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        />

        <Switch checked={usePin} onCheckedChange={setUsePin} label={t('pinSwitch')} description={t('pinHint')} />
        {usePin && (
          <Controller
            control={control}
            name="pin"
            render={({ field }) => <PinInput label={t('pin')} value={field.value} onChange={field.onChange} error={errors.pin?.message} />}
          />
        )}

        <Button type="submit" size="lg" fullWidth loading={create.isPending}>
          {t('submit')}
        </Button>
      </form>
    </ParentPage>
  );
}
