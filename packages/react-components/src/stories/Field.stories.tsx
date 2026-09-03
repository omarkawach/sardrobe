import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Field } from '../components/Field'
import { Button } from '../components/Button'

const meta = {
  title: 'Components/Field',
  component: Field.Root,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Field.Root>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Field.Root>
        <Field.Label>Username</Field.Label>
        <Field.Control placeholder="Enter username" />
      </Field.Root>
    </div>
  ),
}

export const WithDescription: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Field.Root>
        <Field.Label>Email</Field.Label>
        <Field.Control type="email" placeholder="you@example.com" />
        <Field.Description>We'll never share your email with anyone.</Field.Description>
      </Field.Root>
    </div>
  ),
}

export const Required: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Field.Root>
        <Field.Label>
          Name <span style={{ color: 'hsl(var(--destructive))' }}>*</span>
        </Field.Label>
        <Field.Control required placeholder="Enter your name" />
        <Field.Error match="valueMissing">Name is required</Field.Error>
      </Field.Root>
    </div>
  ),
}

export const EmailValidation: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Field.Root>
        <Field.Label>Email</Field.Label>
        <Field.Control type="email" required placeholder="you@example.com" />
        <Field.Error match="valueMissing">Email is required</Field.Error>
        <Field.Error match="typeMismatch">Please enter a valid email address</Field.Error>
        <Field.Description>Enter your work email</Field.Description>
      </Field.Root>
    </div>
  ),
}

export const PasswordWithMinLength: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Field.Root>
        <Field.Label>Password</Field.Label>
        <Field.Control type="password" required minLength={8} placeholder="Enter password" />
        <Field.Error match="valueMissing">Password is required</Field.Error>
        <Field.Error match="tooShort">Password must be at least 8 characters</Field.Error>
        <Field.Description>Must be at least 8 characters long</Field.Description>
      </Field.Root>
    </div>
  ),
}

export const PatternValidation: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Field.Root>
        <Field.Label>Phone Number</Field.Label>
        <Field.Control
          type="tel"
          required
          pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
          placeholder="123-456-7890"
        />
        <Field.Error match="valueMissing">Phone number is required</Field.Error>
        <Field.Error match="patternMismatch">Please use format: 123-456-7890</Field.Error>
      </Field.Root>
    </div>
  ),
}

export const NumberRange: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Field.Root>
        <Field.Label>Age</Field.Label>
        <Field.Control type="number" required min={18} max={120} placeholder="Enter your age" />
        <Field.Error match="valueMissing">Age is required</Field.Error>
        <Field.Error match="rangeUnderflow">You must be at least 18</Field.Error>
        <Field.Error match="rangeOverflow">Please enter a valid age</Field.Error>
      </Field.Root>
    </div>
  ),
}

export const CustomValidation: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Field.Root
        validate={(value) => {
          const reserved = ['admin', 'root', 'system']
          if (reserved.includes(String(value).toLowerCase())) {
            return 'This username is reserved'
          }
          return null
        }}
      >
        <Field.Label>Username</Field.Label>
        <Field.Control required placeholder="Choose a username" />
        <Field.Error match="valueMissing">Username is required</Field.Error>
        <Field.Error>This username is reserved</Field.Error>
        <Field.Description>Cannot be admin, root, or system</Field.Description>
      </Field.Root>
    </div>
  ),
}

export const ValidateOnBlur: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Field.Root validationMode="onBlur">
        <Field.Label>Email</Field.Label>
        <Field.Control type="email" required placeholder="you@example.com" />
        <Field.Error match="valueMissing">Email is required</Field.Error>
        <Field.Error match="typeMismatch">Please enter a valid email</Field.Error>
        <Field.Description>Validation triggers when you leave the field</Field.Description>
      </Field.Root>
    </div>
  ),
}

export const ValidateOnChange: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Field.Root validationMode="onChange" validationDebounceTime={300}>
        <Field.Label>Username</Field.Label>
        <Field.Control required minLength={3} placeholder="At least 3 characters" />
        <Field.Error match="valueMissing">Username is required</Field.Error>
        <Field.Error match="tooShort">Username must be at least 3 characters</Field.Error>
        <Field.Description>Validation triggers as you type (debounced 300ms)</Field.Description>
      </Field.Root>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Field.Root disabled>
        <Field.Label>Disabled Field</Field.Label>
        <Field.Control placeholder="Cannot edit this" />
        <Field.Description>This field is disabled</Field.Description>
      </Field.Root>
    </div>
  ),
}

export const WithValidity: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Field.Root>
        <Field.Label>Password</Field.Label>
        <Field.Control type="password" required minLength={8} />
        <Field.Validity>
          {(state) => (
            <ul
              style={{
                margin: '0.5rem 0 0',
                padding: '0 0 0 1.25rem',
                fontSize: '0.75rem',
                color: 'hsl(var(--muted-foreground))',
              }}
            >
              <li
                style={{
                  color: state.validity.valueMissing ? 'hsl(var(--destructive))' : 'inherit',
                }}
              >
                Required
              </li>
              <li
                style={{ color: state.validity.tooShort ? 'hsl(var(--destructive))' : 'inherit' }}
              >
                At least 8 characters
              </li>
            </ul>
          )}
        </Field.Validity>
      </Field.Root>
    </div>
  ),
}

export const FormExample: Story = {
  render: function FormExample() {
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 2000)
    }

    return (
      <form onSubmit={handleSubmit} style={{ width: '320px' }}>
        <Field.Root name="name">
          <Field.Label>
            Name <span style={{ color: 'hsl(var(--destructive))' }}>*</span>
          </Field.Label>
          <Field.Control required placeholder="John Doe" />
          <Field.Error match="valueMissing">Name is required</Field.Error>
        </Field.Root>

        <Field.Root name="email">
          <Field.Label>
            Email <span style={{ color: 'hsl(var(--destructive))' }}>*</span>
          </Field.Label>
          <Field.Control type="email" required placeholder="john@example.com" />
          <Field.Error match="valueMissing">Email is required</Field.Error>
          <Field.Error match="typeMismatch">Please enter a valid email</Field.Error>
        </Field.Root>

        <Field.Root name="company">
          <Field.Label>Company</Field.Label>
          <Field.Control placeholder="Acme Inc." />
          <Field.Description>Optional</Field.Description>
        </Field.Root>

        <Field.Root name="password">
          <Field.Label>
            Password <span style={{ color: 'hsl(var(--destructive))' }}>*</span>
          </Field.Label>
          <Field.Control
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
          <Field.Error match="valueMissing">Password is required</Field.Error>
          <Field.Error match="tooShort">Password must be at least 8 characters</Field.Error>
        </Field.Root>

        <Button type="submit" color="primary" style={{ marginTop: '0.5rem' }}>
          {submitted ? 'Submitted!' : 'Create Account'}
        </Button>
      </form>
    )
  },
}
