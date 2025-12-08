# Ongoing Notes

## Tasks

First update .prd files and docs. Then add granular tasks to tasks.md. Finally implement the tasks.

### Registration
- [ ] on login, if not in wholesale group, redirect to register
- [ ] shipping address isn't set on register (after server is fixed, validate this works)
- [ ] when on /products/account/register, clicking on link to /products/account doesn't do anything; it doesn't consider the route change as different; it should change url and update the page contents
- [ ] On products/account, add a new div. ec-cart__step at the end of .ec-cart__account-info with 
  eg
```html<div class="ec-cart__step ec-cart-step ec-cart-step--simple ec-cart-step--email"><div class="ec-cart-step__block">
	<div class="ec-cart-step__icon ec-cart-step__icon--custom"><svg height="34" viewBox="0 0 34 34" width="34" xmlns="http://www.w3.org/2000/svg"><path d="M6.591 29.04c2.246-3.17 6.58-3.257 7.774-4.858l.194-1.647c-2.386-1.209-4.084-3.904-4.084-7.314C10.475 10.73 13.397 8 17 8c3.604 0 6.526 2.73 6.526 7.221 0 3.38-1.64 6.058-3.995 7.286l.222 1.788c1.301 1.514 5.461 1.653 7.657 4.751" fill="none" fill-rule="evenodd" stroke="currentColor"></path></svg></div>
	<div class="ec-cart-step__wrap">
		<div class="ec-cart-step__title ec-header-h6">Test Customer StateName</div>
		<div class="ec-cart-step__body">
			<div class="ec-cart-step__section">
				<div class="ec-cart-step__text">bala.bosch@gmail.com</div><a class="ec-cart-step__change ec-link" tabindex="0" href="javascript:;" role="button">Edit</a></div>
			</div>
		</div>
	</div>
</div>
```

- [ ] For logged in user, when NOT in wholesaler group, registration form is accessible through products/account/register; For logged in user that is in whoelsaler group, registration form is accessible at products/account/edit and has different labels and messages
  - [ ] Constraint: do not change any of the below when displaying the form on products/account/register, only when displaying the form on products/account/edit
  - [ ] Email field is hidden
  - [ ] submit button label changes from "Register" to "Save"
  - [ ] after submit, instead of "Your wholesale registration has been submitted." banner we display "Your info has been updated."
  - [ ] All error messages related to registration should be changed to saving info- Add flag in code to track if we are on register or edit page
- [ ] The pages products/account/register and products/account/edit should not be available when not logged in, and redirect to /account if accessed
- [ ] When user is logged in but not in wholesaler group, products/account/register should be accessible and products/account/edit should NOT be accessible, and redirect to /account if accessed
- [ ] When user is logged in AND in wholesaler group, products/account/register should NOT be accessible and redirect to /account if accessed, and products/account/edit should be accessible
- [ ] When user is logged in AND in wholesaler group, redirect to products/account after saving info, instead of redirecting to products

### Wholesale gating
- [ ] on all account/* pages, when not wholesale, hide .ec-cart-step--bag and .ec-cart-step--favorites
- [ ] on all pages, when not wholesale, hide all anchors with href="/products/cart"

